import type { RankingEntry, RankingTop } from "@/entities/ranking/model/types";
import type { Theme } from "@/entities/theme/model/types";
import { formatDayKey, formatDayKeyForTimeZone } from "@/shared/lib/day-key";

type MeResponse = {
  status: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export const formatDayKeyForTZ = formatDayKeyForTimeZone;

function dishImage(seed: string) {
  return `https://picsum.photos/seed/${seed}/800/800`;
}

export function getMockTheme(dayKey = formatDayKey()): Theme {
  return {
    dayKey,
    themeText: "Neon Street Food Remix",
    themeTextEn: "Neon Street Food Remix",
    themeImageUrl: dishImage(`theme-${dayKey}`),
  };
}

export function getMockMe(): MeResponse {
  return { status: "ELIGIBLE" };
}

function makeRankingEntry(dayKey: string, rank: number): RankingEntry {
  const baseSeed = `${dayKey}-rank-${pad(rank)}`;
  const leftScore = 8.8 - rank * 0.2;
  const rightScore = 8.3 - rank * 0.18;
  const isLeftWinner = leftScore >= rightScore;
  const score = isLeftWinner ? leftScore : rightScore;
  return {
    rank,
    dishId: baseSeed,
    dishName: `Hall Dish #${pad(rank)}`,
    authorName: `Chef_${pad(rank)}`,
    imageUrl: dishImage(`${baseSeed}-${isLeftWinner ? "left" : "right"}`),
    score,
    leftImageUrl: dishImage(`${baseSeed}-left`),
    rightImageUrl: dishImage(`${baseSeed}-right`),
    leftScore,
    rightScore,
  };
}

export function getMockRankingTop(dayKey = formatDayKey(), count = 10): RankingTop {
  const safeCount = Math.max(0, Math.floor(Number(count)));
  const items = Array.from({ length: safeCount }, (_, index) =>
    makeRankingEntry(dayKey, index + 1),
  );
  return { dayKey, items };
}
