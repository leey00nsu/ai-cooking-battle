import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueCreatePipelineJob } from "@/lib/queue/create-pipeline-job";
import {
  hasReservationExpired,
  markReservationFailed,
  reclaimSlotReservation,
} from "@/lib/slot-recovery";

export const runtime = "nodejs";

type GeneratePayload = {
  reservationId?: string;
  idempotencyKey?: string;
  validationId?: string;
};

function extractTranslatedPromptEn(originalPrompt: string, outputJson: unknown) {
  if (!outputJson || typeof outputJson !== "object") {
    return null;
  }
  const record = outputJson as Record<string, unknown>;
  const translated = record.translatedPromptEn;
  if (typeof translated !== "string") {
    return null;
  }
  const candidate = translated.replace(/\s+/g, " ").trim();
  if (!candidate) {
    return null;
  }
  const maxLen = Math.min(240, Math.max(80, originalPrompt.length * 6));
  if (candidate.length > maxLen) {
    return null;
  }
  return candidate;
}

const isUniqueConstraintError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GeneratePayload;

  const reservationId = body.reservationId?.toString().trim() ?? "";
  const idempotencyKey = body.idempotencyKey?.toString().trim() ?? "";
  const validationId = body.validationId?.toString().trim() ?? "";

  if (!reservationId || !idempotencyKey || !validationId) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_FIELDS",
        message: "reservationId, idempotencyKey, and validationId are required.",
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

  const validationLog = await prisma.openAiCallLog.findUnique({
    where: { id: validationId },
  });

  if (
    !validationLog ||
    validationLog.userId !== userId ||
    validationLog.kind !== "PROMPT_VALIDATE"
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_NOT_FOUND",
        message: "Validation not found.",
      },
      { status: 404 },
    );
  }

  if (validationLog.decision !== "ALLOW") {
    return NextResponse.json(
      {
        ok: false,
        code: "PROMPT_BLOCKED",
        message: validationLog.reason ?? "프롬프트가 차단되었습니다.",
      },
      { status: 409 },
    );
  }

  const prompt = validationLog.inputPrompt.trim();
  const promptEn = extractTranslatedPromptEn(prompt, validationLog.outputJson) ?? null;
  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_INVALID",
        message: "Validation prompt is invalid.",
      },
      { status: 400 },
    );
  }

  const existingRequest = await prisma.createRequest.findUnique({
    where: {
      userId_idempotencyKey: {
        userId,
        idempotencyKey,
      },
    },
  });

  if (existingRequest) {
    if (existingRequest.reservationId !== reservationId) {
      return NextResponse.json(
        {
          ok: false,
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency key already used with another reservation.",
        },
        { status: 409 },
      );
    }

    if (!existingRequest.prompt || (promptEn && !existingRequest.promptEn)) {
      await prisma.createRequest.update({
        where: { id: existingRequest.id },
        data: {
          ...(existingRequest.prompt ? {} : { prompt }),
          ...(promptEn && !existingRequest.promptEn ? { promptEn } : {}),
        },
      });
    }

    if (existingRequest.status !== "DONE" && existingRequest.status !== "FAILED") {
      try {
        await enqueueCreatePipelineJob({ requestId: existingRequest.id });
      } catch (error) {
        console.warn("[create.generate] failed to enqueue job for existing request", {
          requestId: existingRequest.id,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          {
            ok: false,
            code: "QUEUE_UNAVAILABLE",
            message: "생성 대기열이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
          },
          { status: 503 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      requestId: existingRequest.id,
      status: "PROCESSING",
    });
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

  if (hasReservationExpired(reservation)) {
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

  if (reservation.status === "FAILED") {
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_FAILED",
        message: "Reservation failed.",
      },
      { status: 409 },
    );
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_CANCELLED",
        message: "Reservation cancelled.",
      },
      { status: 409 },
    );
  }

  if (reservation.status !== "CONFIRMED") {
    await prisma.slotReservation.update({
      where: { id: reservation.id },
      data: { status: "CONFIRMED" },
    });
  }

  try {
    const requestRecord = await prisma.createRequest.create({
      data: {
        userId,
        idempotencyKey,
        prompt,
        promptEn,
        reservationId: reservation.id,
        status: "GENERATING",
      },
    });

    try {
      await enqueueCreatePipelineJob({ requestId: requestRecord.id });
    } catch (error) {
      console.warn("[create.generate] failed to enqueue job", {
        requestId: requestRecord.id,
        error: error instanceof Error ? error.message : String(error),
      });
      await prisma.createRequest.update({
        where: { id: requestRecord.id },
        data: { status: "FAILED" },
      });
      await markReservationFailed(reservation);
      return NextResponse.json(
        {
          ok: false,
          code: "QUEUE_UNAVAILABLE",
          message: "생성 대기열이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      requestId: requestRecord.id,
      status: "PROCESSING",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const duplicated = await prisma.createRequest.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
      });

      if (duplicated) {
        if (duplicated.reservationId !== reservation.id) {
          return NextResponse.json(
            {
              ok: false,
              code: "IDEMPOTENCY_CONFLICT",
              message: "Idempotency key already used with another reservation.",
            },
            { status: 409 },
          );
        }

        if (!duplicated.prompt || (promptEn && !duplicated.promptEn)) {
          await prisma.createRequest.update({
            where: { id: duplicated.id },
            data: {
              ...(duplicated.prompt ? {} : { prompt }),
              ...(promptEn && !duplicated.promptEn ? { promptEn } : {}),
            },
          });
        }

        if (duplicated.status !== "DONE" && duplicated.status !== "FAILED") {
          try {
            await enqueueCreatePipelineJob({ requestId: duplicated.id });
          } catch (enqueueError) {
            console.warn("[create.generate] failed to enqueue job for duplicated request", {
              requestId: duplicated.id,
              error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
            });
            return NextResponse.json(
              {
                ok: false,
                code: "QUEUE_UNAVAILABLE",
                message: "생성 대기열이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
              },
              { status: 503 },
            );
          }
        }

        return NextResponse.json({
          ok: true,
          requestId: duplicated.id,
          status: "PROCESSING",
        });
      }
    }

    await markReservationFailed(reservation);
    throw error;
  }
}
