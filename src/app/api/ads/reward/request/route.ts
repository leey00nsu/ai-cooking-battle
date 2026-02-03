import { NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const REWARD_TTL_MINUTES = 15;

const isUniqueConstraintError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
};

export async function POST() {
  const userId = await getGuestUserId();
  const dayKey = formatDayKeyForKST();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REWARD_TTL_MINUTES * 60 * 1000);

  const existingPending = await prisma.adReward.findFirst({
    where: {
      userId,
      dayKey,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending && (!existingPending.expiresAt || existingPending.expiresAt > now)) {
    return NextResponse.json({
      ok: true,
      rewardId: existingPending.id,
      nonce: existingPending.nonce,
      expiresAt: existingPending.expiresAt?.toISOString() ?? null,
    });
  }

  if (existingPending?.expiresAt && existingPending.expiresAt <= now) {
    await prisma.adReward.update({
      where: { id: existingPending.id },
      data: { status: "EXPIRED" },
    });
  }

  try {
    const reward = await prisma.adReward.create({
      data: {
        dayKey,
        status: "PENDING",
        nonce: globalThis.crypto.randomUUID(),
        expiresAt,
        userId,
      },
    });

    return NextResponse.json({
      ok: true,
      rewardId: reward.id,
      nonce: reward.nonce,
      expiresAt: reward.expiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const duplicated = await prisma.adReward.findFirst({
        where: {
          userId,
          dayKey,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });

      if (duplicated) {
        return NextResponse.json({
          ok: true,
          rewardId: duplicated.id,
          nonce: duplicated.nonce,
          expiresAt: duplicated.expiresAt?.toISOString() ?? null,
        });
      }
    }

    throw error;
  }
}
