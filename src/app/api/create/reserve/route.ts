import { NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";
import { reclaimSlotReservation } from "@/lib/slot-recovery";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const RESERVATION_TTL_MS = 5 * 60 * 1000;

type ReservePayload = {
  idempotencyKey?: string;
  adRewardId?: string;
};

type ReservationResult =
  | {
      type: "existing" | "created";
      reservationId: string;
      slotType: "FREE" | "AD";
      expiresAt: Date;
    }
  | { type: "error"; status: number; code: string; message: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ReservePayload;
  const idempotencyKey = body.idempotencyKey?.trim() ?? "";
  const adRewardId = body.adRewardId?.trim() ?? "";

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_IDEMPOTENCY_KEY",
        message: "idempotencyKey is required.",
      },
      { status: 400 },
    );
  }

  const userId = await getGuestUserId();
  const dayKey = formatDayKeyForKST();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

  const result = await prisma.$transaction<ReservationResult>(async (tx) => {
    const existing = await tx.slotReservation.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.expiresAt.getTime() < now.getTime()) {
        await reclaimSlotReservation(existing);
      } else {
        return {
          type: "existing",
          reservationId: existing.id,
          slotType: existing.slotType,
          expiresAt: existing.expiresAt,
        };
      }
    }

    const counter = await tx.dailySlotCounter.upsert({
      where: { dayKey },
      update: {},
      create: { dayKey },
    });

    const freeRemaining = counter.freeLimit - counter.freeUsedCount;
    if (freeRemaining > 0) {
      const reservation = await tx.slotReservation.create({
        data: {
          userId,
          dayKey,
          status: "RESERVED",
          slotType: "FREE",
          expiresAt,
          idempotencyKey,
        },
      });

      await tx.dailySlotCounter.update({
        where: { dayKey },
        data: { freeUsedCount: { increment: 1 } },
      });

      return {
        type: "created",
        reservationId: reservation.id,
        slotType: reservation.slotType,
        expiresAt: reservation.expiresAt,
      };
    }

    if (!adRewardId) {
      return {
        type: "error",
        status: 400,
        code: "AD_REWARD_REQUIRED",
        message: "Ad reward is required for ad slots.",
      };
    }

    const reward = await tx.adReward.findFirst({
      where: {
        id: adRewardId,
        userId,
        dayKey,
      },
    });

    if (!reward || reward.status !== "GRANTED") {
      return {
        type: "error",
        status: 404,
        code: "AD_REWARD_INVALID",
        message: "Ad reward is not valid.",
      };
    }

    if (reward.expiresAt && reward.expiresAt.getTime() < now.getTime()) {
      return {
        type: "error",
        status: 410,
        code: "AD_REWARD_EXPIRED",
        message: "Ad reward expired.",
      };
    }

    const adRemaining = counter.adLimit - counter.adUsedCount;
    if (adRemaining <= 0) {
      return {
        type: "error",
        status: 409,
        code: "SLOT_SOLD_OUT",
        message: "Ad slots sold out.",
      };
    }

    const reservation = await tx.slotReservation.create({
      data: {
        userId,
        dayKey,
        status: "RESERVED",
        slotType: "AD",
        adRewardId: reward.id,
        expiresAt,
        idempotencyKey,
      },
    });

    await tx.dailySlotCounter.update({
      where: { dayKey },
      data: { adUsedCount: { increment: 1 } },
    });

    await tx.adReward.update({
      where: { id: reward.id },
      data: {
        status: "USED",
        usedAt: reward.usedAt ?? now,
      },
    });

    return {
      type: "created",
      reservationId: reservation.id,
      slotType: reservation.slotType,
      expiresAt: reservation.expiresAt,
    };
  });

  if (result.type === "error") {
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        message: result.message,
      },
      { status: result.status },
    );
  }

  const expiresInSeconds = Math.max(
    0,
    Math.floor((result.expiresAt.getTime() - now.getTime()) / 1000),
  );

  return NextResponse.json({
    ok: true,
    slotType: result.slotType === "FREE" ? "free" : "ad",
    reservationId: result.reservationId,
    expiresInSeconds,
  });
}
