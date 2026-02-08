import { NextResponse } from "next/server";
import { getHomeDataSource } from "@/shared/api/home-data-source";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ dayKey: string }>;
  },
) {
  const { dayKey } = await context.params;
  const source = getHomeDataSource();
  return NextResponse.json(await source.getSnapshotTop({ dayKey, count: 4 }));
}
