import { NextResponse } from "next/server";
import { getHomeDataSource } from "@/shared/api/home-data-source";

export const runtime = "nodejs";
const DEFAULT_SNAPSHOT_COUNT = 10;
const MAX_SNAPSHOT_COUNT = 50;

function getSnapshotCount(url: string) {
  const { searchParams } = new URL(url);
  const rawCount = searchParams.get("count");
  if (rawCount === null) {
    return DEFAULT_SNAPSHOT_COUNT;
  }

  const parsedCount = Number(rawCount);
  if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
    return DEFAULT_SNAPSHOT_COUNT;
  }

  return Math.min(Math.floor(parsedCount), MAX_SNAPSHOT_COUNT);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ dayKey: string }>;
  },
) {
  const { dayKey } = await context.params;
  const count = getSnapshotCount(request.url);
  const source = getHomeDataSource();
  return NextResponse.json(await source.getSnapshotTop({ dayKey, count }));
}
