import { formatDayKeyForTZ, getMockTheme } from "@/shared/api/mock-home-data";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const serviceTimeZone = "Asia/Seoul";
  const dayKey = formatDayKeyForTZ(serviceTimeZone);
  return NextResponse.json(getMockTheme(dayKey));
}
