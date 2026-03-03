import {
  getPublicRankingDishWhere,
  getRankingOrderBy,
} from "@/entities/ranking/model/ranking-policy";
import type { RankingTop } from "@/entities/ranking/model/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_COUNT = 10;
const MAX_COUNT = 50;
const AUTHOR_FALLBACK = "Unknown Chef";

function toSafeCount(count: number | undefined) {
  if (!Number.isFinite(count) || (count ?? 0) <= 0) {
    return DEFAULT_COUNT;
  }
  return Math.min(Math.floor(count as number), MAX_COUNT);
}

export async function listRankingTop(args: {
  dayKey: string;
  count?: number;
  includeBots?: boolean;
}): Promise<RankingTop> {
  const dayKey = args.dayKey.toString().trim();
  const count = toSafeCount(args.count);
  if (!dayKey) {
    return { dayKey, items: [] };
  }

  const rows = await prisma.dishDayScore.findMany({
    where: {
      dayKey,
      status: "READY",
      dish: getPublicRankingDishWhere({ includeBots: args.includeBots }),
    },
    orderBy: getRankingOrderBy(),
    take: count,
    select: {
      dishId: true,
      totalScore: true,
      dish: {
        select: {
          dishName: true,
          imageUrl: true,
          user: {
            select: {
              name: true,
            },
          },
          botMeta: {
            select: {
              persona: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    dayKey,
    items: rows.map((row, index) => {
      const score = row.totalScore;
      const imageUrl = row.dish.imageUrl;

      return {
        rank: index + 1,
        dishId: row.dishId,
        dishName: row.dish.dishName,
        authorName: row.dish.botMeta?.persona.displayName || row.dish.user.name || AUTHOR_FALLBACK,
        imageUrl,
        score,
        leftImageUrl: imageUrl,
        rightImageUrl: imageUrl,
        leftScore: score,
        rightScore: score,
      };
    }),
  };
}
