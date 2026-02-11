import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type DishScoreAxisAType,
  type DishScoreAxisBType,
  type DishScoreThemeSignals,
  type DishScoreThemeWeights,
  generateDishScoreWithOpenAiWithRaw,
} from "@/lib/providers/openai-dish-score-generator";
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
  axisAType: DishScoreAxisAType;
  axisA: string;
  axisBType: DishScoreAxisBType;
  axisB: string;
  axisFlavor: string;
  themeWeights: DishScoreThemeWeights;
  themeSignals: DishScoreThemeSignals;
  prompt: string;
  promptEn: string | null;
}) {
  return JSON.stringify({
    themeTextKo: args.themeText,
    themeTextEn: args.themeTextEn,
    axisAType: args.axisAType,
    axisA: args.axisA,
    axisBType: args.axisBType,
    axisB: args.axisB,
    axisFlavor: args.axisFlavor,
    themeWeights: args.themeWeights,
    themeSignals: args.themeSignals,
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
    axisAType: DishScoreAxisAType;
    axisA: string;
    axisBType: DishScoreAxisBType;
    axisB: string;
    axisFlavor: string;
    themeWeights: DishScoreThemeWeights;
    themeSignals: DishScoreThemeSignals;
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
          axisAType: args.theme.axisAType,
          axisA: args.theme.axisA,
          axisBType: args.theme.axisBType,
          axisB: args.theme.axisB,
          axisFlavor: args.theme.axisFlavor,
          themeWeights: args.theme.themeWeights,
          themeSignals: args.theme.themeSignals,
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
    axisAType: DishScoreAxisAType;
    axisA: string;
    axisBType: DishScoreAxisBType;
    axisB: string;
    axisFlavor: string;
    themeWeights: DishScoreThemeWeights;
    themeSignals: DishScoreThemeSignals;
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
          axisAType: args.theme.axisAType,
          axisA: args.theme.axisA,
          axisBType: args.theme.axisBType,
          axisB: args.theme.axisB,
          axisFlavor: args.theme.axisFlavor,
          themeWeights: args.theme.themeWeights,
          themeSignals: args.theme.themeSignals,
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

const DEFAULT_THEME_WEIGHTS: DishScoreThemeWeights = {
  A: 15,
  B: 55,
  F: 30,
};

const DEFAULT_THEME_SIGNALS: DishScoreThemeSignals = {
  A: ["일상 상황이 느껴지는 간단한 상차림"],
  B: ["요리 형태가 주제 축과 일치"],
  F: ["풍미를 드러내는 재료 포인트"],
};

function normalizeAxisAType(value: string): DishScoreAxisAType {
  if (value === "상황" || value === "장소" || value === "분위기") {
    return value;
  }
  return "상황";
}

function normalizeAxisBType(value: string): DishScoreAxisBType {
  if (value === "음식종류" || value === "특정재료" || value === "조리법") {
    return value;
  }
  return "음식종류";
}

function normalizeThemeWeights(value: Prisma.JsonValue): DishScoreThemeWeights {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_THEME_WEIGHTS;
  }
  const record = value as Record<string, unknown>;
  const A = typeof record.A === "number" ? record.A : NaN;
  const B = typeof record.B === "number" ? record.B : NaN;
  const F = typeof record.F === "number" ? record.F : NaN;
  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(F)) {
    return DEFAULT_THEME_WEIGHTS;
  }
  if (Math.abs(A + B + F - 100) > 0.001) {
    return DEFAULT_THEME_WEIGHTS;
  }
  return { A, B, F };
}

function normalizeThemeSignals(value: Prisma.JsonValue): DishScoreThemeSignals {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_THEME_SIGNALS;
  }
  const record = value as Record<string, unknown>;

  const normalizeList = (source: unknown): string[] | null => {
    if (!Array.isArray(source)) {
      return null;
    }
    const parsed = source
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .slice(0, 3);
    if (parsed.length < 1) {
      return null;
    }
    return parsed;
  };

  const A = normalizeList(record.A);
  const B = normalizeList(record.B);
  const F = normalizeList(record.F);
  if (!A || !B || !F) {
    return DEFAULT_THEME_SIGNALS;
  }

  return { A, B, F };
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
        axisAType: true,
        axisA: true,
        axisBType: true,
        axisB: true,
        axisFlavor: true,
        themeWeights: true,
        themeSignals: true,
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
    const normalizedTheme = {
      themeText: theme.themeText,
      themeTextEn: theme.themeTextEn,
      axisAType: normalizeAxisAType(theme.axisAType),
      axisA: theme.axisA,
      axisBType: normalizeAxisBType(theme.axisBType),
      axisB: theme.axisB,
      axisFlavor: theme.axisFlavor,
      themeWeights: normalizeThemeWeights(theme.themeWeights),
      themeSignals: normalizeThemeSignals(theme.themeSignals),
    };

    const scored = await generateDishScoreWithOpenAiWithRaw({
      themeText: normalizedTheme.themeText,
      themeTextEn: normalizedTheme.themeTextEn,
      axisAType: normalizedTheme.axisAType,
      axisA: normalizedTheme.axisA,
      axisBType: normalizedTheme.axisBType,
      axisB: normalizedTheme.axisB,
      axisFlavor: normalizedTheme.axisFlavor,
      themeWeights: normalizedTheme.themeWeights,
      themeSignals: normalizedTheme.themeSignals,
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
        themeText: normalizedTheme.themeText,
        themeTextEn: normalizedTheme.themeTextEn,
        axisAType: normalizedTheme.axisAType,
        axisA: normalizedTheme.axisA,
        axisBType: normalizedTheme.axisBType,
        axisB: normalizedTheme.axisB,
        axisFlavor: normalizedTheme.axisFlavor,
        themeWeights: normalizedTheme.themeWeights,
        themeSignals: normalizedTheme.themeSignals,
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
        axisAType: normalizeAxisAType(theme.axisAType),
        axisA: theme.axisA,
        axisBType: normalizeAxisBType(theme.axisBType),
        axisB: theme.axisB,
        axisFlavor: theme.axisFlavor,
        themeWeights: normalizeThemeWeights(theme.themeWeights),
        themeSignals: normalizeThemeSignals(theme.themeSignals),
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
