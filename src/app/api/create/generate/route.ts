import { NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";
import {
  hasReservationExpired,
  markReservationFailed,
  reclaimSlotReservation,
} from "@/lib/slot-recovery";

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

  const userId = await getGuestUserId();

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
        reservationId: reservation.id,
        status: "GENERATING",
      },
    });

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
