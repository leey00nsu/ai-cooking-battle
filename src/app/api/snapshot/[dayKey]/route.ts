import { getMockSnapshotTop } from "@/shared/api/mock-home-data";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ dayKey: string }>;
  },
) {
  const { dayKey } = await context.params;
  return NextResponse.json(getMockSnapshotTop(dayKey));
}
