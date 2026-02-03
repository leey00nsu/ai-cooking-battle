import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { AD_SLOT_LIMIT, FREE_SLOT_LIMIT } from "@/shared/lib/slot-policy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const dayKey = formatDayKeyForKST();
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
  const counter = await prisma.dailySlotCounter.upsert({
    where: { dayKey },
    update: {
      updatedAt: new Date(),
      freeLimit: FREE_SLOT_LIMIT,
      adLimit: AD_SLOT_LIMIT,
    },
    create: { dayKey, freeLimit: FREE_SLOT_LIMIT, adLimit: AD_SLOT_LIMIT },
  });

  const freeReservation = await prisma.slotReservation.findFirst({
    where: {
      userId,
      dayKey,
      slotType: "FREE",
    },
    select: { id: true },
  });

  return NextResponse.json({
    freeLimit: counter.freeLimit,
    freeUsedCount: counter.freeUsedCount,
    adLimit: counter.adLimit,
    adUsedCount: counter.adUsedCount,
    hasUsedFreeSlotToday: Boolean(freeReservation),
  });
}
