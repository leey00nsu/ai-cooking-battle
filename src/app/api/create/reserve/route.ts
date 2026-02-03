import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reclaimSlotReservation } from "@/lib/slot-recovery";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { AD_SLOT_LIMIT, FREE_SLOT_LIMIT } from "@/shared/lib/slot-policy";

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

const isUniqueConstraintError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
};

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
  const dayKey = formatDayKeyForKST();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

  const asExistingResult = (reservation: {
    id: string;
    slotType: "FREE" | "AD";
    expiresAt: Date;
  }): ReservationResult => ({
    type: "existing",
    reservationId: reservation.id,
    slotType: reservation.slotType,
    expiresAt: reservation.expiresAt,
  });

  let result: ReservationResult;
  try {
    result = await prisma.$transaction<ReservationResult>(async (tx) => {
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
          return {
            type: "error",
            status: 410,
            code: "RESERVATION_EXPIRED",
            message: "Reservation expired.",
          };
        }
        return asExistingResult(existing);
      }

      const counter = await tx.dailySlotCounter.upsert({
        where: { dayKey },
        update: {
          updatedAt: new Date(),
          freeLimit: FREE_SLOT_LIMIT,
          adLimit: AD_SLOT_LIMIT,
        },
        create: { dayKey, freeLimit: FREE_SLOT_LIMIT, adLimit: AD_SLOT_LIMIT },
      });

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { freeDailyLimit: true },
      });
      const freeDailyLimit = user?.freeDailyLimit ?? 1;

      const freeRemaining = counter.freeLimit - counter.freeUsedCount;
      const activeFreeReservationCount = await tx.slotReservation.count({
        where: {
          userId,
          dayKey,
          slotType: "FREE",
          status: { in: ["RESERVED", "CONFIRMED"] },
        },
      });

      if (freeRemaining > 0 && activeFreeReservationCount < freeDailyLimit) {
        try {
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
        } catch (error) {
          throw error;
        }
      }

      if (activeFreeReservationCount >= freeDailyLimit && !adRewardId) {
        return {
          type: "error",
          status: 429,
          code: "FREE_SLOT_LIMIT_REACHED",
          message: "무료 슬롯은 하루 1회만 가능합니다.",
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

      try {
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
      } catch (error) {
        throw error;
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const latest = await prisma.slotReservation.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
      });

      if (latest) {
        if (latest.expiresAt.getTime() < now.getTime()) {
          await reclaimSlotReservation(latest);
          return NextResponse.json(
            {
              ok: false,
              code: "RESERVATION_EXPIRED",
              message: "Reservation expired.",
            },
            { status: 410 },
          );
        }
        result = asExistingResult(latest);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

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
