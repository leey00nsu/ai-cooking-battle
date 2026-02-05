import { NextResponse } from "next/server";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { formatDayKeyForTZ } from "@/shared/api/mock-home-data";

export const runtime = "nodejs";

export async function GET() {
  const serviceTimeZone = "Asia/Seoul";
  const dayKey = formatDayKeyForTZ(serviceTimeZone);
  const theme = await getOrCreateDayTheme(dayKey);
  return NextResponse.json({
    dayKey: theme.dayKey,
    themeText: theme.themeText,
    themeTextEn: theme.themeTextEn,
    themeImageUrl: theme.themeImageUrl,
  });
}
