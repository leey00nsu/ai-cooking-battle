import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

export async function GET() {
  const dayKey = formatDayKeyForKST();
  const counter = await prisma.dailySlotCounter.upsert({
    where: { dayKey },
    update: { updatedAt: new Date() },
    create: { dayKey },
  });

  return NextResponse.json({
    freeLimit: counter.freeLimit,
    freeUsedCount: counter.freeUsedCount,
    adLimit: counter.adLimit,
    adUsedCount: counter.adUsedCount,
  });
}
