import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
import { AD_SLOT_LIMIT, FREE_SLOT_LIMIT } from "@/shared/lib/slot-policy";

export const runtime = "nodejs";

export async function GET() {
  const dayKey = formatDayKeyForKST();

  const counter = await prisma.dailySlotCounter.upsert({
    where: { dayKey },
    update: {
      updatedAt: new Date(),
      freeLimit: FREE_SLOT_LIMIT,
      adLimit: AD_SLOT_LIMIT,
    },
    create: { dayKey, freeLimit: FREE_SLOT_LIMIT, adLimit: AD_SLOT_LIMIT },
  });

  return NextResponse.json({
    freeLimit: counter.freeLimit,
    freeUsedCount: counter.freeUsedCount,
    adLimit: counter.adLimit,
    adUsedCount: counter.adUsedCount,
  });
}
