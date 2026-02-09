import { NextResponse } from "next/server";
import { getHomeDataSource } from "@/shared/api/home-data-source";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

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
  const dayKey = formatDayKeyForKST();
  const limit = getLimit(request.url);
  const source = getHomeDataSource();
  return NextResponse.json(await source.getMatchFeed({ dayKey, limit }));
}
