import { prisma } from "@/lib/prisma";

type DishDetailErrorCode = "INVALID_DISH_ID" | "DISH_NOT_FOUND" | "DISH_RESTRICTED";

export type DishDetailSuccess = {
  type: "success";
  dish: {
    id: string;
    imageUrl: string;
    dishName: string;
    dishNameEn: string | null;
    createdAt: string;
  };
  author: {
    type: "user" | "bot";
    displayName: string;
    userId: string | null;
    personaId: string | null;
  };
  theme: {
    dayKey: string | null;
    themeText: string | null;
  };
  score: {
    status: "ready" | "pending";
    total: number | null;
    themeFit: number | null;
    execution: number | null;
    oneLiner: string | null;
    reasons: string[] | null;
    tip: string | null;
  };
};

export type DishDetailError = {
  type: "error";
  code: DishDetailErrorCode;
  message: string;
};

export type DishDetailResult = DishDetailSuccess | DishDetailError;

const DISH_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;
const BOT_AUTHOR_LABEL_FALLBACK = "AI Chef Bot";

function toDishId(rawDishId: string) {
  const dishId = rawDishId.toString().trim();
  if (!dishId || !DISH_ID_PATTERN.test(dishId)) {
    return null;
  }
  return dishId;
}

function normalizeReasons(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const reasons = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return reasons.length > 0 ? reasons : null;
}

function toPendingScore(): DishDetailSuccess["score"] {
  return {
    status: "pending",
    total: null,
    themeFit: null,
    execution: null,
    oneLiner: null,
    reasons: null,
    tip: null,
  };
}

export async function getDishDetail(rawDishId: string): Promise<DishDetailResult> {
  const dishId = toDishId(rawDishId);
  if (!dishId) {
    return {
      type: "error",
      code: "INVALID_DISH_ID",
      message: "유효하지 않은 dishId 형식입니다.",
    };
  }

  const dish = await prisma.dish.findUnique({
    where: { id: dishId },
    select: {
      id: true,
      userId: true,
      dishName: true,
      dishNameEn: true,
      imageUrl: true,
      createdAt: true,
      isHidden: true,
      user: {
        select: {
          name: true,
        },
      },
      botMeta: {
        select: {
          personaKey: true,
          persona: {
            select: {
              displayName: true,
            },
          },
        },
      },
      dayScores: {
        orderBy: [{ dayKey: "desc" }],
        take: 1,
        select: {
          dayKey: true,
          totalScore: true,
          themeFit: true,
          execution: true,
          oneLiner: true,
          reasons: true,
          tip: true,
          status: true,
        },
      },
    },
  });

  if (!dish) {
    return {
      type: "error",
      code: "DISH_NOT_FOUND",
      message: "요리를 찾을 수 없습니다.",
    };
  }

  if (dish.isHidden) {
    return {
      type: "error",
      code: "DISH_RESTRICTED",
      message: "제한된 요리입니다.",
    };
  }

  const dayScore = dish.dayScores[0];
  const dayTheme = dayScore
    ? await prisma.dayTheme.findUnique({
        where: { dayKey: dayScore.dayKey },
        select: { dayKey: true, themeText: true },
      })
    : null;

  const isBot = Boolean(dish.botMeta);
  const authorDisplayName = isBot
    ? dish.botMeta?.persona.displayName || BOT_AUTHOR_LABEL_FALLBACK
    : dish.user.name;

  const score =
    dayScore?.status === "READY"
      ? {
          status: "ready" as const,
          total: dayScore.totalScore,
          themeFit: dayScore.themeFit,
          execution: dayScore.execution,
          oneLiner: dayScore.oneLiner,
          reasons: normalizeReasons(dayScore.reasons),
          tip: dayScore.tip,
        }
      : toPendingScore();

  return {
    type: "success",
    dish: {
      id: dish.id,
      imageUrl: dish.imageUrl,
      dishName: dish.dishName,
      dishNameEn: dish.dishNameEn,
      createdAt: dish.createdAt.toISOString(),
    },
    author: {
      type: isBot ? "bot" : "user",
      displayName: authorDisplayName,
      userId: isBot ? null : dish.userId,
      personaId: dish.botMeta?.personaKey ?? null,
    },
    theme: {
      dayKey: dayScore?.dayKey ?? null,
      themeText: dayTheme?.themeText ?? null,
    },
    score,
  };
}
