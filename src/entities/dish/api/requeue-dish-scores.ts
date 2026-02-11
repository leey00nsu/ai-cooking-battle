import { prisma } from "@/lib/prisma";
import { enqueueDishScoreJob } from "@/lib/queue/dish-score-job";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISH_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;
const DEFAULT_LIMIT = 100;
const MIN_LIMIT = 1;
const MAX_LIMIT = 500;

type RequeueDishScoresRawInput = {
  dayKey?: string | null;
  dishId?: string | null;
  limit?: number | null;
};

export type RequeueDishScoresInput = {
  dayKey?: string;
  dishId?: string;
  limit?: number;
};

type RequeueDishScoresError = {
  type: "error";
  status: number;
  code: string;
  message: string;
};

type RequeueDishScoresOk = {
  type: "ok";
  dayKey: string;
  requested: number;
  enqueued: number;
  skipped: number;
  failed: number;
};

export type RequeueDishScoresResult = RequeueDishScoresError | RequeueDishScoresOk;

function normalizeInput(input: RequeueDishScoresInput): RequeueDishScoresRawInput {
  return {
    dayKey: input.dayKey?.toString().trim() || null,
    dishId: input.dishId?.toString().trim() || null,
    limit:
      typeof input.limit === "number" && Number.isFinite(input.limit)
        ? Math.floor(input.limit)
        : null,
  };
}

function resolveDayKey(value: string | null | undefined) {
  const dayKey = value || formatDayKeyForKST();
  return DAY_KEY_PATTERN.test(dayKey) ? dayKey : null;
}

function resolveLimit(value: number | null | undefined) {
  const limit = value ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    return null;
  }
  return limit;
}

function resolveDishId(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return DISH_ID_PATTERN.test(value) ? value : "";
}

export async function requeueDishScores(
  input: RequeueDishScoresInput = {},
): Promise<RequeueDishScoresResult> {
  const normalized = normalizeInput(input);
  const dayKey = resolveDayKey(normalized.dayKey);
  if (!dayKey) {
    return {
      type: "error",
      status: 400,
      code: "INVALID_DAY_KEY",
      message: "dayKey format must be YYYY-MM-DD.",
    };
  }

  const dishId = resolveDishId(normalized.dishId);
  if (dishId === "") {
    return {
      type: "error",
      status: 400,
      code: "INVALID_DISH_ID",
      message: "dishId format is invalid.",
    };
  }

  const limit = resolveLimit(normalized.limit);
  if (!limit) {
    return {
      type: "error",
      status: 400,
      code: "INVALID_LIMIT",
      message: `limit must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
    };
  }

  const targets = dishId
    ? await prisma.dishDayScore.findMany({
        where: {
          dishId,
          dayKey,
          status: { in: ["PENDING", "FAILED"] },
          analyzedAt: null,
        },
        orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          dishId: true,
          dayKey: true,
        },
      })
    : await prisma.dishDayScore.findMany({
        where: {
          dayKey,
          status: { in: ["PENDING", "FAILED"] },
          analyzedAt: null,
        },
        orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
        take: limit,
        select: {
          dishId: true,
          dayKey: true,
        },
      });

  let enqueued = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      const jobId = await enqueueDishScoreJob(
        {
          dishId: target.dishId,
          dayKey: target.dayKey,
        },
        { singleton: false },
      );

      if (jobId) {
        enqueued += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      console.warn("[admin.dish-scores.requeue] failed to enqueue dish-score", {
        dishId: target.dishId,
        dayKey: target.dayKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    type: "ok",
    dayKey,
    requested: targets.length,
    enqueued,
    skipped,
    failed,
  };
}
