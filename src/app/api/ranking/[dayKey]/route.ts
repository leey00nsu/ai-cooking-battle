import { NextResponse } from "next/server";
import { listRankingArchive } from "@/entities/ranking/api/list-ranking-archive";
import { getHomeDataSource } from "@/shared/api/home-data-source";

export const runtime = "nodejs";
const DEFAULT_RANKING_COUNT = 10;
const MAX_RANKING_COUNT = 50;
const DEFAULT_ARCHIVE_LIMIT = 12;
const MAX_ARCHIVE_LIMIT = 24;
const RANKING_VIEW_ARCHIVE = "archive";
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function getView(url: string) {
  const { searchParams } = new URL(url);
  return searchParams.get("view")?.trim();
}

function getArchiveLimit(url: string) {
  const { searchParams } = new URL(url);
  const parsed = Number(searchParams.get("limit"));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ARCHIVE_LIMIT;
  }
  return Math.min(Math.floor(parsed), MAX_ARCHIVE_LIMIT);
}

function getArchiveOffset(url: string) {
  const { searchParams } = new URL(url);
  const parsed = Number(searchParams.get("offset"));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function getArchiveSearch(url: string) {
  const { searchParams } = new URL(url);
  const search = searchParams.get("search")?.trim();
  return search ? search : null;
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ dayKey: string }>;
  },
) {
  const { dayKey: rawDayKey } = await context.params;
  const dayKey = rawDayKey.trim();
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return NextResponse.json({ error: "INVALID_DAY_KEY" }, { status: 400 });
  }
  const view = getView(request.url);
  if (view === RANKING_VIEW_ARCHIVE) {
    const limit = getArchiveLimit(request.url);
    const offset = getArchiveOffset(request.url);
    const search = getArchiveSearch(request.url);
    return NextResponse.json(
      await listRankingArchive({
        dayKey,
        limit,
        offset,
        search,
      }),
    );
  }

  const count = getRankingCount(request.url);
  const source = getHomeDataSource();
  return NextResponse.json(await source.getRankingTop({ dayKey, count }));
}
