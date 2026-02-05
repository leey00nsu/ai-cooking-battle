import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shouldReplaceDayThemeImageUrl } from "@/lib/day-theme/day-theme-image";
import { getOrCreateDayTheme } from "@/lib/day-theme/get-or-create-day-theme";
import { enqueueDayThemePrecreateJob } from "@/lib/queue/day-theme-precreate-job";
import { formatDayKeyForTZ } from "@/shared/api/mock-home-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const serviceTimeZone = "Asia/Seoul";
  const dayKey = formatDayKeyForTZ(serviceTimeZone);
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  const userId = session?.user?.id?.toString().trim() ?? null;

  const theme = await getOrCreateDayTheme(dayKey, { userId });

  if (shouldReplaceDayThemeImageUrl(theme.themeImageUrl)) {
    enqueueDayThemePrecreateJob({ dayKey }).catch((error) => {
      console.warn("[theme.today] failed to enqueue precreate job", {
        dayKey,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
  return NextResponse.json({
    dayKey: theme.dayKey,
    themeText: theme.themeText,
    themeTextEn: theme.themeTextEn,
    themeImageUrl: theme.themeImageUrl,
  });
}
