import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ConfirmPayload = {
  nonce?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ConfirmPayload;
  const nonce = body.nonce?.trim() ?? "";
  const idempotencyKey = body.idempotencyKey?.trim() ?? "";

  if (!nonce || !idempotencyKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_FIELDS",
        message: "nonce and idempotencyKey are required.",
      },
      { status: 400 },
    );
  }

  const reward = await prisma.adReward.findUnique({
    where: { nonce },
  });

  if (!reward) {
    return NextResponse.json(
      {
        ok: false,
        code: "REWARD_NOT_FOUND",
        message: "Reward not found.",
      },
      { status: 404 },
    );
  }

  if (reward.expiresAt && reward.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        code: "REWARD_EXPIRED",
        message: "Reward expired.",
      },
      { status: 410 },
    );
  }

  if (reward.confirmIdempotencyKey && reward.confirmIdempotencyKey !== idempotencyKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency key already used.",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.adReward.update({
    where: { nonce },
    data: {
      status: "GRANTED",
      confirmIdempotencyKey: idempotencyKey,
      grantedAt: reward.grantedAt ?? new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    rewardId: updated.id,
    status: updated.status,
  });
}
