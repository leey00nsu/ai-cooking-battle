import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePromptWithOpenAiWithRaw } from "@/lib/providers/openai-prompt-validator";
import { ProviderError } from "@/lib/providers/provider-error";
import { checkRateLimit } from "@/lib/rate-limit/user-rate-limit";
import {
  cancelSlotReservation,
  hasReservationExpired,
  reclaimSlotReservation,
} from "@/lib/slot-recovery";

export const runtime = "nodejs";

type ValidatePayload = {
  prompt?: string;
  reservationId?: string;
};

const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function sanitizePreview(value: string, maxLen = 120) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLen ? `${singleLine.slice(0, maxLen)}…` : singleLine;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ValidatePayload;

  const prompt = body.prompt?.trim() ?? "";
  const reservationId = body.reservationId?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_REQUIRED",
        message: "Prompt is required.",
      },
      { status: 400 },
    );
  }

  if (!reservationId) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_RESERVATION_ID",
        message: "reservationId is required.",
      },
      { status: 400 },
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const reservation = await prisma.slotReservation.findFirst({
    where: {
      id: reservationId,
      userId,
    },
  });

  if (!reservation) {
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_NOT_FOUND",
        message: "Reservation not found.",
      },
      { status: 404 },
    );
  }

  if (reservation.status === "RESERVED" && hasReservationExpired(reservation)) {
    await reclaimSlotReservation(reservation);
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_EXPIRED",
        message: "Reservation expired.",
      },
      { status: 410 },
    );
  }

  if (reservation.status !== "RESERVED") {
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_NOT_ACTIVE",
        message: "Reservation is not active.",
      },
      { status: 409 },
    );
  }

  const rateLimit = checkRateLimit({
    key: `create.validate:${userId}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `요청이 너무 많습니다. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    console.log("[create.validate] request", {
      promptLength: prompt.length,
      promptPreview: sanitizePreview(prompt),
      reservationId,
    });

    const validated = await validatePromptWithOpenAiWithRaw(prompt);
    const result = validated.result;

    let validationId: string | null = null;
    try {
      const log = await prisma.openAiCallLog.create({
        data: {
          kind: "PROMPT_VALIDATE",
          model: validated.raw.model,
          openAiResponseId: validated.raw.openAiResponseId,
          userId,
          inputPrompt: prompt,
          outputText: validated.raw.outputText,
          outputJson: validated.raw.outputJson as Prisma.InputJsonValue,
          decision: result.decision,
          category: result.ok ? "OK" : result.category,
          reason: result.ok ? null : result.fixGuide,
        },
      });
      validationId = log.id;
    } catch (logError) {
      console.warn("[create.validate] failed to persist openai call log", {
        error: logError instanceof Error ? logError.message : String(logError),
      });
      try {
        await cancelSlotReservation(reservation);
      } catch (refundError) {
        console.warn("[create.validate] failed to refund reservation after log failure", {
          reservationId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_LOG_FAILED",
          message: "검증 로그 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }

    if (result.ok) {
      const warnings =
        result.warnings?.map((warning) => ({
          category: warning.category,
          message: sanitizePreview(warning.message, 160),
        })) ?? null;
      console.log("[create.validate] response", {
        ok: true,
        decision: result.decision,
        normalizedPromptLength: result.normalizedPrompt.length,
        normalizedPromptPreview: sanitizePreview(result.normalizedPrompt),
        translatedPromptEnLength: result.translatedPromptEn?.length ?? null,
        warnings,
      });
      return NextResponse.json({
        ok: true,
        normalizedPrompt: result.normalizedPrompt,
        translatedPromptEn: result.translatedPromptEn,
        validationId,
      });
    }

    try {
      await cancelSlotReservation(reservation);
    } catch (refundError) {
      console.warn("[create.validate] failed to refund reservation after block", {
        reservationId,
        error: refundError instanceof Error ? refundError.message : String(refundError),
      });
      return NextResponse.json(
        {
          ok: false,
          code: "RESERVATION_REFUND_FAILED",
          message: "예약 환불 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }

    console.log("[create.validate] response", {
      ok: false,
      decision: result.decision,
      category: result.category,
      fixGuide: result.fixGuide,
      normalizedPromptLength: result.normalizedPrompt?.length ?? null,
      normalizedPromptPreview: result.normalizedPrompt
        ? sanitizePreview(result.normalizedPrompt)
        : null,
    });

    return NextResponse.json({
      ok: false,
      code: "PROMPT_BLOCKED",
      message: result.fixGuide,
      category: result.category,
      fixGuide: result.fixGuide,
      normalizedPrompt: result.normalizedPrompt ?? null,
      translatedPromptEn: result.translatedPromptEn,
      validationId,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.warn("[create.validate] provider error", {
        provider: error.provider,
        code: error.code,
        status: error.status ?? null,
        message: error.message,
        reservationId,
      });

      try {
        await prisma.openAiCallLog.create({
          data: {
            kind: "PROMPT_VALIDATE",
            model: process.env.OPENAI_PROMPT_VALIDATION_MODEL?.trim() || "gpt-5.2-mini",
            userId,
            inputPrompt: prompt,
            errorCode: error.code,
            errorStatus: error.status ?? null,
            errorMessage: error.message,
          },
        });
      } catch (logError) {
        console.warn("[create.validate] failed to persist openai error log", {
          error: logError instanceof Error ? logError.message : String(logError),
        });
      }

      try {
        await cancelSlotReservation(reservation);
      } catch (refundError) {
        console.warn("[create.validate] failed to refund reservation after provider error", {
          reservationId,
          error: refundError instanceof Error ? refundError.message : String(refundError),
        });
        return NextResponse.json(
          {
            ok: false,
            code: "RESERVATION_REFUND_FAILED",
            message: "예약 환불 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_UNAVAILABLE",
          message: "검증 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
