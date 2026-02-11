import { prisma } from "@/lib/prisma";
import { enqueueDishScoreJob } from "@/lib/queue/dish-score-job";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DEFAULT_STALE_MINUTES = 10;
const MAX_STALE_MINUTES = 24 * 60;
const DEFAULT_LOOKBACK_DAYS = 2;
const MAX_LOOKBACK_DAYS = 7;

type ProcessDishScoreRecoveryJobArgs = {
  dayKey?: string;
  limit?: number;
  staleMinutes?: number;
};

export type DishScoreRecoveryJobResult = {
  dayKeyFrom: string;
  dayKeyTo: string;
  requested: number;
  enqueued: number;
  skipped: number;
  failed: number;
  limit: number;
  staleMinutes: number;
};

function toIntOrFallback(raw: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function resolveLimit(value?: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded < 1) return 1;
    if (rounded > MAX_LIMIT) return MAX_LIMIT;
    return rounded;
  }

  return toIntOrFallback(process.env.DISH_SCORE_RECOVERY_LIMIT, DEFAULT_LIMIT, 1, MAX_LIMIT);
}

function resolveStaleMinutes(value?: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    if (rounded < 1) return 1;
    if (rounded > MAX_STALE_MINUTES) return MAX_STALE_MINUTES;
    return rounded;
  }

  return toIntOrFallback(
    process.env.DISH_SCORE_RECOVERY_STALE_MINUTES,
    DEFAULT_STALE_MINUTES,
    1,
    MAX_STALE_MINUTES,
  );
}

function resolveLookbackDays() {
  return toIntOrFallback(
    process.env.DISH_SCORE_RECOVERY_LOOKBACK_DAYS,
    DEFAULT_LOOKBACK_DAYS,
    1,
    MAX_LOOKBACK_DAYS,
  );
}

function resolveDayRange(dayKey: string | undefined, now: Date) {
  const target = dayKey?.toString().trim() ?? "";
  if (target) {
    if (!DAY_KEY_PATTERN.test(target)) {
      throw new Error("[dish-score-recovery] dayKey format must be YYYY-MM-DD.");
    }
    return { from: target, to: target };
  }

  const to = formatDayKeyForKST(now);
  const lookbackDays = resolveLookbackDays();
  const fromDate = new Date(now.getTime() - (lookbackDays - 1) * DAY_MS);
  const from = formatDayKeyForKST(fromDate);
  return { from, to };
}

export async function processDishScoreRecoveryJob(
  args: ProcessDishScoreRecoveryJobArgs = {},
): Promise<DishScoreRecoveryJobResult> {
  const now = new Date();
  const limit = resolveLimit(args.limit);
  const staleMinutes = resolveStaleMinutes(args.staleMinutes);
  const cutoff = new Date(now.getTime() - staleMinutes * 60 * 1000);
  const dayRange = resolveDayRange(args.dayKey, now);

  const targets = await prisma.dishDayScore.findMany({
    where: {
      dayKey: {
        gte: dayRange.from,
        lte: dayRange.to,
      },
      status: { in: ["PENDING", "FAILED"] },
      analyzedAt: null,
      updatedAt: {
        lte: cutoff,
      },
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
      console.warn("[dish-score-recovery] failed to enqueue dish-score", {
        dishId: target.dishId,
        dayKey: target.dayKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    dayKeyFrom: dayRange.from,
    dayKeyTo: dayRange.to,
    requested: targets.length,
    enqueued,
    skipped,
    failed,
    limit,
    staleMinutes,
  };
}
