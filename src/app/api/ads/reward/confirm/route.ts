import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
      AND: [
        {
          OR: [{ confirmIdempotencyKey: null }, { confirmIdempotencyKey: idempotencyKey }],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
    },
    data: {
      status: "GRANTED",
      confirmIdempotencyKey: idempotencyKey,
      grantedAt: reward.grantedAt ?? now,
    },
  });

  if (count === 0) {
    const latestNonExpired = await prisma.adReward.findFirst({
      where: {
        id: reward.id,
        nonce,
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (latestNonExpired?.confirmIdempotencyKey === idempotencyKey) {
      return NextResponse.json({
        ok: true,
        rewardId: latestNonExpired.id,
        status: latestNonExpired.status,
      });
    }

    const latest = await prisma.adReward.findFirst({
      where: { id: reward.id, nonce, userId },
    });

    if (!latest) {
      return NextResponse.json(
        {
          ok: false,
          code: "REWARD_NOT_FOUND",
          message: "Reward not found.",
        },
        { status: 404 },
      );
    }

    if (latest.confirmIdempotencyKey === idempotencyKey) {
      return NextResponse.json({
        ok: true,
        rewardId: latest.id,
        status: latest.status,
      });
    }

    if (latest.confirmIdempotencyKey && latest.confirmIdempotencyKey !== idempotencyKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency key already used.",
        },
        { status: 409 },
      );
    }

    if (latest.expiresAt && latest.expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json(
        {
          ok: false,
          code: "REWARD_EXPIRED",
          message: "Reward expired.",
        },
        { status: 410 },
      );
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
