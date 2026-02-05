import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { formatDayKeyForTZ } from "@/shared/api/mock-home-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const serviceTimeZone = "Asia/Seoul";
  const dayKey = formatDayKeyForTZ(serviceTimeZone);
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  const userId = session?.user?.id?.toString().trim() ?? null;

  const theme = await getOrCreateDayTheme(dayKey, { userId });
  return NextResponse.json({
    dayKey: theme.dayKey,
    themeText: theme.themeText,
    themeTextEn: theme.themeTextEn,
    themeImageUrl: theme.themeImageUrl,
  });
}
