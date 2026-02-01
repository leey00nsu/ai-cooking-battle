import { NextResponse } from "next/server";
import { getMockMatchFeed } from "@/shared/api/mock-home-data";
import { formatDayKey } from "@/shared/lib/day-key";

export const runtime = "nodejs";

function getLimit(url: string) {
  const { searchParams } = new URL(url);
  const raw = Number(searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return 8;
  }
  return Math.min(Math.floor(raw), 24);
}

export async function GET(request: Request) {
  const dayKey = formatDayKey();
  const limit = getLimit(request.url);
  return NextResponse.json(getMockMatchFeed(dayKey, limit));
}
