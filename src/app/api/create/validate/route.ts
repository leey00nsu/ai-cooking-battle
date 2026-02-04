import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePromptWithOpenAiWithRaw } from "@/lib/providers/openai-prompt-validator";
import { ProviderError } from "@/lib/providers/provider-error";
import { checkRateLimit } from "@/lib/rate-limit/user-rate-limit";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { AD_SLOT_LIMIT, FREE_SLOT_LIMIT } from "@/shared/lib/slot-policy";

export const runtime = "nodejs";

type ValidatePayload = {
  prompt?: string;
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

  const dayKey = formatDayKeyForKST();
  try {
    const counter = await prisma.dailySlotCounter.upsert({
      where: { dayKey },
      update: {
        updatedAt: new Date(),
        freeLimit: FREE_SLOT_LIMIT,
        adLimit: AD_SLOT_LIMIT,
      },
      create: { dayKey, freeLimit: FREE_SLOT_LIMIT, adLimit: AD_SLOT_LIMIT },
    });

    const freeRemaining = counter.freeLimit - counter.freeUsedCount;
    const adRemaining = counter.adLimit - counter.adUsedCount;
    const totalRemaining = freeRemaining + adRemaining;

    if (totalRemaining <= 0) {
      console.log("[create.validate] fail-fast", {
        reason: "SLOT_SOLD_OUT",
        dayKey,
        freeRemaining,
        adRemaining,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "SLOT_SOLD_OUT",
          message: "오늘의 생성 슬롯이 모두 소진되었습니다.",
        },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freeDailyLimit: true },
    });
    const freeDailyLimit = user?.freeDailyLimit ?? 1;

    const activeFreeReservationCount = await prisma.slotReservation.count({
      where: {
        userId,
        dayKey,
        slotType: "FREE",
        status: { in: ["RESERVED", "CONFIRMED"] },
      },
    });

    if (freeRemaining <= 0) {
      console.log("[create.validate] fail-fast", {
        reason: "FREE_SLOT_SOLD_OUT",
        dayKey,
        freeRemaining,
        adRemaining,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "FREE_SLOT_SOLD_OUT",
          message: "오늘의 무료 슬롯이 모두 소진되었습니다.",
        },
        { status: 409 },
      );
    }

    if (activeFreeReservationCount >= freeDailyLimit) {
      console.log("[create.validate] fail-fast", {
        reason: "FREE_SLOT_LIMIT_REACHED",
        dayKey,
        activeFreeReservationCount,
        freeDailyLimit,
      });
      const limitMessage =
        freeDailyLimit === 1
          ? "무료 슬롯은 하루 1회만 가능합니다."
          : `무료 슬롯은 하루 ${freeDailyLimit}회만 가능합니다.`;
      return NextResponse.json(
        {
          ok: false,
          code: "FREE_SLOT_LIMIT_REACHED",
          message: limitMessage,
        },
        { status: 429 },
      );
    }
  } catch (error) {
    console.warn("[create.validate] slot check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: "SLOT_CHECK_UNAVAILABLE",
        message: "슬롯 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }

  try {
    console.log("[create.validate] request", {
      promptLength: prompt.length,
      promptPreview: sanitizePreview(prompt),
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
