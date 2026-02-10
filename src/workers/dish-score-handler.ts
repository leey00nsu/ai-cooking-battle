import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateDishScoreWithOpenAiWithRaw } from "@/lib/providers/openai-dish-score-generator";
import { ProviderError } from "@/lib/providers/provider-error";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackServerEvent } from "@/shared/analytics/track-server-event";

type ProcessDishScoreJobArgs = {
  dishId: string;
  dayKey: string;
};

export type DishScoreJobResult =
  | {
      status: "SKIPPED_READY";
      dishId: string;
      dayKey: string;
    }
  | {
      status: "READY";
      dishId: string;
      dayKey: string;
      totalScore: number;
    }
  | {
      status: "FAILED";
      dishId: string;
      dayKey: string;
      errorCode: string;
    };

function normalizeErrorCode(error: unknown) {
  if (error instanceof ProviderError) {
    return `${error.provider}:${error.code}`;
  }
  return "UNKNOWN_ERROR";
}

function isRetryableError(error: unknown) {
  if (error instanceof ProviderError) {
    if (error.code === "TIMEOUT") return true;
    if (error.code === "UNKNOWN") return true;
    if (error.code === "HTTP_ERROR") {
      const status = error.status ?? 0;
      return status >= 500 || status === 429;
    }
    return false;
  }
  return false;
}

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toOpenAiErrorStatus(error: unknown) {
  if (!(error instanceof ProviderError)) {
    return null;
  }
  return error.status ?? null;
}

function getDishUserType(dish: { botMeta: { id: string } | null }) {
  return dish.botMeta ? "bot" : "user";
}

function buildDishScoreInputPrompt(args: {
  themeText: string;
  themeTextEn: string;
  prompt: string;
  promptEn: string | null;
}) {
  return JSON.stringify({
    themeTextKo: args.themeText,
    themeTextEn: args.themeTextEn,
    dishPromptKo: args.prompt,
    dishPromptEn: args.promptEn ?? "",
  });
}

async function persistDishScoreSuccessLog(args: {
  dish: {
    userId: string;
    prompt: string;
    promptEn: string | null;
    imageUrl: string;
  };
  theme: {
    themeText: string;
    themeTextEn: string;
  };
  raw: {
    model: string;
    openAiResponseId: string | null;
    outputText: string;
    outputJson: unknown;
  };
}) {
  try {
    await prisma.openAiCallLog.create({
      data: {
        kind: "DISH_SCORE",
        model: args.raw.model,
        openAiResponseId: args.raw.openAiResponseId,
        userId: args.dish.userId,
        inputPrompt: buildDishScoreInputPrompt({
          themeText: args.theme.themeText,
          themeTextEn: args.theme.themeTextEn,
          prompt: args.dish.prompt,
          promptEn: args.dish.promptEn,
        }),
        inputImageUrl: args.dish.imageUrl,
        outputText: args.raw.outputText,
        outputJson: args.raw.outputJson as Prisma.InputJsonValue,
        decision: "READY",
        category: "OK",
      },
    });
  } catch (error) {
    console.warn("[dish-score] failed to persist openai success log", {
      error: normalizeErrorMessage(error),
    });
  }
}

async function persistDishScoreErrorLog(args: {
  dish: {
    userId: string;
    prompt: string;
    promptEn: string | null;
    imageUrl: string;
  };
  theme: {
    themeText: string;
    themeTextEn: string;
  };
  error: unknown;
  errorCode: string;
}) {
  try {
    await prisma.openAiCallLog.create({
      data: {
        kind: "DISH_SCORE",
        model: process.env.OPENAI_DISH_SCORE_MODEL?.trim() || "gpt-5-mini",
        userId: args.dish.userId,
        inputPrompt: buildDishScoreInputPrompt({
          themeText: args.theme.themeText,
          themeTextEn: args.theme.themeTextEn,
          prompt: args.dish.prompt,
          promptEn: args.dish.promptEn,
        }),
        inputImageUrl: args.dish.imageUrl,
        errorCode: args.errorCode,
        errorStatus: toOpenAiErrorStatus(args.error),
        errorMessage: normalizeErrorMessage(args.error),
      },
    });
  } catch (logError) {
    console.warn("[dish-score] failed to persist openai error log", {
      error: normalizeErrorMessage(logError),
    });
  }
}

function toNullableJsonInput(
  value: string[] | null,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

async function upsertDishScoreStatus(args: {
  dishId: string;
  dayKey: string;
  status: "PENDING" | "READY" | "FAILED";
  totalScore?: number;
  themeFit?: number;
  execution?: number;
  oneLiner?: string | null;
  reasons?: string[] | null;
  tip?: string | null;
  analyzedAt?: Date | null;
  errorCode?: string | null;
}) {
  const updateData = {
    status: args.status,
    ...(typeof args.totalScore === "number" ? { totalScore: args.totalScore } : {}),
    ...(typeof args.themeFit === "number" ? { themeFit: args.themeFit } : {}),
    ...(typeof args.execution === "number" ? { execution: args.execution } : {}),
    ...(args.oneLiner !== undefined ? { oneLiner: args.oneLiner } : {}),
    ...(args.reasons !== undefined ? { reasons: toNullableJsonInput(args.reasons) } : {}),
    ...(args.tip !== undefined ? { tip: args.tip } : {}),
    ...(args.analyzedAt !== undefined ? { analyzedAt: args.analyzedAt } : {}),
    ...(args.errorCode !== undefined ? { errorCode: args.errorCode } : {}),
  };

  const createData = {
    dishId: args.dishId,
    dayKey: args.dayKey,
    totalScore: args.totalScore ?? 0,
    themeFit: args.themeFit ?? 0,
    execution: args.execution ?? 0,
    oneLiner: args.oneLiner ?? null,
    reasons: toNullableJsonInput(args.reasons ?? null),
    tip: args.tip ?? null,
    status: args.status,
    analyzedAt: args.analyzedAt ?? null,
    errorCode: args.errorCode ?? null,
  };

  await prisma.dishDayScore.upsert({
    where: {
      dishId_dayKey: {
        dishId: args.dishId,
        dayKey: args.dayKey,
      },
    },
    update: updateData,
    create: createData,
  });
}

export async function processDishScoreJob(
  args: ProcessDishScoreJobArgs,
): Promise<DishScoreJobResult> {
  const dishId = args.dishId?.toString().trim() ?? "";
  const dayKey = args.dayKey?.toString().trim() ?? "";
  if (!dishId || !dayKey) {
    throw new Error("[dish-score] dishId and dayKey are required.");
  }

  const existing = await prisma.dishDayScore.findUnique({
    where: {
      dishId_dayKey: {
        dishId,
        dayKey,
      },
    },
    select: { status: true },
  });

  if (existing?.status === "READY") {
    return { status: "SKIPPED_READY", dishId, dayKey };
  }

  const [dish, theme] = await Promise.all([
    prisma.dish.findUnique({
      where: { id: dishId },
      select: {
        userId: true,
        prompt: true,
        promptEn: true,
        imageUrl: true,
        botMeta: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.dayTheme.findUnique({
      where: { dayKey },
      select: {
        themeText: true,
        themeTextEn: true,
      },
    }),
  ]);

  if (!dish || !theme) {
    const errorCode = !dish ? "DISH_NOT_FOUND" : "THEME_NOT_FOUND";
    await upsertDishScoreStatus({
      dishId,
      dayKey,
      status: "FAILED",
      analyzedAt: null,
      errorCode,
    });
    trackServerEvent(ANALYTICS_EVENTS.SCORE_FAILED, {
      dishId,
      dayKey,
      errorCode,
      userType: "unknown",
      retryable: false,
    });
    return { status: "FAILED", dishId, dayKey, errorCode };
  }

  await upsertDishScoreStatus({
    dishId,
    dayKey,
    status: "PENDING",
    analyzedAt: null,
    errorCode: null,
  });

  try {
    const scored = await generateDishScoreWithOpenAiWithRaw({
      themeText: theme.themeText,
      themeTextEn: theme.themeTextEn,
      prompt: dish.prompt,
      promptEn: dish.promptEn,
      imageUrl: dish.imageUrl,
    });

    await upsertDishScoreStatus({
      dishId,
      dayKey,
      status: "READY",
      totalScore: scored.result.total,
      themeFit: scored.result.themeFit,
      execution: scored.result.execution,
      oneLiner: scored.result.oneLiner,
      reasons: scored.result.reasons,
      tip: scored.result.tip,
      analyzedAt: new Date(),
      errorCode: null,
    });

    await persistDishScoreSuccessLog({
      dish: {
        userId: dish.userId,
        prompt: dish.prompt,
        promptEn: dish.promptEn,
        imageUrl: dish.imageUrl,
      },
      theme: {
        themeText: theme.themeText,
        themeTextEn: theme.themeTextEn,
      },
      raw: {
        model: scored.raw.model,
        openAiResponseId: scored.raw.openAiResponseId,
        outputText: scored.raw.outputText,
        outputJson: scored.raw.outputJson,
      },
    });

    trackServerEvent(ANALYTICS_EVENTS.SCORE_READY, {
      dishId,
      dayKey,
      totalScore: scored.result.total,
      themeFit: scored.result.themeFit,
      execution: scored.result.execution,
      userType: getDishUserType(dish),
    });

    return {
      status: "READY",
      dishId,
      dayKey,
      totalScore: scored.result.total,
    };
  } catch (error) {
    const errorCode = normalizeErrorCode(error);
    await persistDishScoreErrorLog({
      dish: {
        userId: dish.userId,
        prompt: dish.prompt,
        promptEn: dish.promptEn,
        imageUrl: dish.imageUrl,
      },
      theme: {
        themeText: theme.themeText,
        themeTextEn: theme.themeTextEn,
      },
      error,
      errorCode,
    });

    if (isRetryableError(error)) {
      await upsertDishScoreStatus({
        dishId,
        dayKey,
        status: "PENDING",
        analyzedAt: null,
        errorCode,
      });
      trackServerEvent(ANALYTICS_EVENTS.SCORE_FAILED, {
        dishId,
        dayKey,
        errorCode,
        userType: getDishUserType(dish),
        retryable: true,
      });
      throw error;
    }

    await upsertDishScoreStatus({
      dishId,
      dayKey,
      status: "FAILED",
      analyzedAt: null,
      errorCode,
    });
    trackServerEvent(ANALYTICS_EVENTS.SCORE_FAILED, {
      dishId,
      dayKey,
      errorCode,
      userType: getDishUserType(dish),
      retryable: false,
    });
    return { status: "FAILED", dishId, dayKey, errorCode };
  }
}
