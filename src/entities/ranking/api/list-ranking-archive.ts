import type { RankingArchiveResponse, RankingEntry } from "@/entities/ranking/model/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const AUTHOR_FALLBACK = "Unknown Chef";

const KEYWORD_GROUP_TITLES = {
  style: "Dominant Styles",
  ingredient: "Top Ingredients",
  mood: "Theme Mood",
} as const;

const TOKEN_STOP_WORDS = new Set([
  "요리",
  "음식",
  "dish",
  "food",
  "the",
  "and",
  "with",
  "for",
  "chef",
]);

function toSafeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || (limit ?? 0) <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit as number), MAX_LIMIT);
}

function toSafeOffset(offset: number | undefined) {
  if (!Number.isFinite(offset) || (offset ?? 0) <= 0) {
    return 0;
  }
  return Math.floor(offset as number);
}

function toSafeSearch(search: string | null | undefined) {
  const trimmed = search?.trim();
  return trimmed ? trimmed : null;
}

function toRankingEntry(row: {
  dishId: string;
  totalScore: number;
  dish: {
    dishName: string;
    imageUrl: string;
    user: { name: string };
    botMeta: { persona: { displayName: string } } | null;
  };
}): Omit<RankingEntry, "rank"> {
  const score = row.totalScore;
  const imageUrl = row.dish.imageUrl;

  return {
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
}

function toKeywordTokens(source: string) {
  return source
    .split(/[\s,/().:_-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !TOKEN_STOP_WORDS.has(token.toLowerCase()));
}

function hashtag(value: string) {
  return `#${value.replace(/\s+/g, "")}`;
}

function buildKeywordGroups(args: {
  theme?: {
    axisFlavor: string;
    axisB: string;
    axisA: string;
  } | null;
  dishNames: string[];
}) {
  const tokenCounter = new Map<string, number>();
  args.dishNames.forEach((name) => {
    toKeywordTokens(name).forEach((token) => {
      tokenCounter.set(token, (tokenCounter.get(token) ?? 0) + 1);
    });
  });

  const rankedTokens = [...tokenCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  const fromTheme = args.theme
    ? [args.theme.axisFlavor, args.theme.axisB, args.theme.axisA]
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map(hashtag)
    : [];

  const topIngredientKeywords = rankedTokens.slice(0, 4).map(hashtag);
  const moodKeywords = rankedTokens.slice(4, 7).map(hashtag);

  return [
    {
      title: KEYWORD_GROUP_TITLES.style,
      keywords: fromTheme.length > 0 ? fromTheme : [hashtag("오늘의테마"), hashtag("랭킹배틀")],
    },
    {
      title: KEYWORD_GROUP_TITLES.ingredient,
      keywords:
        topIngredientKeywords.length > 0
          ? topIngredientKeywords
          : [hashtag("시그니처"), hashtag("플레이팅")],
    },
    {
      title: KEYWORD_GROUP_TITLES.mood,
      keywords: moodKeywords.length > 0 ? moodKeywords : [hashtag("챔피언"), hashtag("홀오브페임")],
    },
  ];
}

export async function listRankingArchive(args: {
  dayKey: string;
  limit?: number;
  offset?: number;
  search?: string | null;
}): Promise<RankingArchiveResponse> {
  const dayKey = args.dayKey.toString().trim();
  const limit = toSafeLimit(args.limit);
  const offset = toSafeOffset(args.offset);
  const search = toSafeSearch(args.search);

  if (!dayKey) {
    return {
      dayKey,
      themeText: "",
      participantCount: 0,
      averageScore: 0,
      keywordGroups: [],
      items: [],
      nextOffset: null,
    };
  }

  const [theme, aggregate, rows, keywordRows] = await Promise.all([
    prisma.dayTheme.findUnique({
      where: { dayKey },
      select: {
        themeText: true,
        axisA: true,
        axisB: true,
        axisFlavor: true,
      },
    }),
    prisma.dishDayScore.aggregate({
      where: {
        dayKey,
        status: "READY",
        dish: {
          isHidden: false,
        },
      },
      _count: {
        _all: true,
      },
      _avg: {
        totalScore: true,
      },
    }),
    prisma.dishDayScore.findMany({
      where: {
        dayKey,
        status: "READY",
        dish: {
          isHidden: false,
          ...(search ? { dishName: { contains: search, mode: "insensitive" as const } } : {}),
        },
      },
      orderBy: [{ totalScore: "desc" }, { analyzedAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit + 1,
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
    }),
    prisma.dishDayScore.findMany({
      where: {
        dayKey,
        status: "READY",
        dish: {
          isHidden: false,
        },
      },
      orderBy: [{ totalScore: "desc" }, { analyzedAt: "desc" }, { id: "desc" }],
      take: 30,
      select: {
        dish: {
          select: {
            dishName: true,
          },
        },
      },
    }),
  ]);

  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;
  const items = visibleRows.map((row, index) => ({
    rank: offset + index + 1,
    ...toRankingEntry(row),
  }));

  return {
    dayKey,
    themeText: theme?.themeText ?? "",
    participantCount: aggregate._count._all,
    averageScore: aggregate._avg.totalScore ?? 0,
    keywordGroups: buildKeywordGroups({
      theme:
        theme && theme.axisA && theme.axisB && theme.axisFlavor
          ? {
              axisA: theme.axisA,
              axisB: theme.axisB,
              axisFlavor: theme.axisFlavor,
            }
          : null,
      dishNames: keywordRows.map((row) => row.dish.dishName),
    }),
    items,
    nextOffset: hasMore ? offset + visibleRows.length : null,
  };
}
