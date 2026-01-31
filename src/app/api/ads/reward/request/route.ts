import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const REWARD_TTL_MINUTES = 15;

export async function POST() {
  // TODO: 인증 연동 후 실제 userId로 교체
  const dayKey = formatDayKeyForKST();
  const expiresAt = new Date(Date.now() + REWARD_TTL_MINUTES * 60 * 1000);
  const nonce = globalThis.crypto?.randomUUID?.() ?? `nonce_${Date.now()}`;

  const reward = await prisma.adReward.create({
    data: {
      dayKey,
      status: "PENDING",
      nonce,
      expiresAt,
      userId: "guest",
    },
  });

  return NextResponse.json({
    ok: true,
    rewardId: reward.id,
    nonce: reward.nonce,
    expiresAt: reward.expiresAt?.toISOString() ?? null,
  });
}
