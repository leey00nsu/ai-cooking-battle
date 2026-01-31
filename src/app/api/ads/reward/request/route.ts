import { NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const REWARD_TTL_MINUTES = 15;

export async function POST() {
  const userId = await getGuestUserId();
  const dayKey = formatDayKeyForKST();
  const expiresAt = new Date(Date.now() + REWARD_TTL_MINUTES * 60 * 1000);
  const nonce = globalThis.crypto?.randomUUID?.() ?? `nonce_${Date.now()}`;

  const reward = await prisma.adReward.create({
    data: {
      dayKey,
      status: "PENDING",
      nonce,
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
}
