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
  prompt?: string;
  idempotencyKey?: string;
};

const isUniqueConstraintError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GeneratePayload;

  const prompt = (body.prompt ?? "").toString().trim();
  const reservationId = body.reservationId?.toString().trim() ?? "";
  const idempotencyKey = body.idempotencyKey?.toString().trim() ?? "";

  if (!reservationId || !idempotencyKey || prompt === "") {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_FIELDS",
        message: "reservationId, idempotencyKey, and prompt are required.",
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

    if (!existingRequest.prompt) {
      await prisma.createRequest.update({
        where: { id: existingRequest.id },
        data: { prompt },
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

        if (!duplicated.prompt) {
          await prisma.createRequest.update({
            where: { id: duplicated.id },
            data: { prompt },
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
