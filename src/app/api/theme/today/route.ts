import { formatDayKey, getMockTheme } from "@/shared/api/mock-home-data";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const dayKey = formatDayKey();
  return NextResponse.json(getMockTheme(dayKey));
}

