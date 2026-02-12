import { NextResponse } from "next/server";
import { getHomeDataSource } from "@/shared/api/home-data-source";

export const runtime = "nodejs";
const DEFAULT_RANKING_COUNT = 10;
const MAX_RANKING_COUNT = 50;

function getRankingCount(url: string) {
  const { searchParams } = new URL(url);
  const rawCount = searchParams.get("count");
  if (rawCount === null) {
    return DEFAULT_RANKING_COUNT;
  }

  const parsedCount = Number(rawCount);
  if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
    return DEFAULT_RANKING_COUNT;
  }

  return Math.min(Math.floor(parsedCount), MAX_RANKING_COUNT);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ dayKey: string }>;
  },
) {
  const { dayKey } = await context.params;
  const count = getRankingCount(request.url);
  const source = getHomeDataSource();
  return NextResponse.json(await source.getRankingTop({ dayKey, count }));
}
