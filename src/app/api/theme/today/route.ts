import { NextResponse } from "next/server";
import { shouldReplaceDayThemeImageUrl } from "@/lib/day-theme/day-theme-image";
import { prisma } from "@/lib/prisma";
import { enqueueDayThemePrecreateJob } from "@/lib/queue/day-theme-precreate-job";
import { formatDayKeyForTZ } from "@/shared/api/mock-home-data";

export const runtime = "nodejs";

export async function GET() {
  const serviceTimeZone = "Asia/Seoul";
  const dayKey = formatDayKeyForTZ(serviceTimeZone);
  const theme = await prisma.dayTheme.findUnique({ where: { dayKey } });

  if (!theme) {
    enqueueDayThemePrecreateJob({ dayKey }).catch((error) => {
      console.warn("[theme.today] failed to enqueue precreate job", {
        dayKey,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json({
      dayKey,
      themeText: "",
      themeTextEn: "",
      themeImageUrl: null,
      isPending: true,
    });
  }

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
    isPending: false,
  });
}
