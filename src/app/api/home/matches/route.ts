import { NextResponse } from "next/server";
import { getHomeDataSource } from "@/shared/api/home-data-source";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

function getLimit(url: string) {
  const { searchParams } = new URL(url);
  const raw = Number(searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(raw), MAX_LIMIT);
}

export async function GET(request: Request) {
  const dayKey = formatDayKeyForKST();
  const limit = getLimit(request.url);
  const source = getHomeDataSource();
  return NextResponse.json(await source.getMatchFeed({ dayKey, limit }));
}
