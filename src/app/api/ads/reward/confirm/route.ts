import { NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
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

  const userId = await getGuestUserId();
  const reward = await prisma.adReward.findFirst({
    where: { nonce, userId },
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

  if (reward.confirmIdempotencyKey === idempotencyKey) {
    return NextResponse.json({
      ok: true,
      rewardId: reward.id,
      status: reward.status,
    });
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

  const now = new Date();
  const { count } = await prisma.adReward.updateMany({
    where: {
      id: reward.id,
      nonce,
      userId,
      OR: [{ confirmIdempotencyKey: null }, { confirmIdempotencyKey: idempotencyKey }],
    },
    data: {
      status: "GRANTED",
      confirmIdempotencyKey: idempotencyKey,
      grantedAt: reward.grantedAt ?? now,
    },
  });

  if (count === 0) {
    const latest = await prisma.adReward.findFirst({
      where: { id: reward.id, nonce, userId },
    });

    if (latest?.confirmIdempotencyKey === idempotencyKey) {
      return NextResponse.json({
        ok: true,
        rewardId: latest.id,
        status: latest.status,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency key already used.",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.adReward.findUnique({
    where: { id: reward.id },
    select: { id: true, status: true },
  });

  return NextResponse.json({
    ok: true,
    rewardId: updated?.id ?? reward.id,
    status: updated?.status ?? "GRANTED",
  });
}
