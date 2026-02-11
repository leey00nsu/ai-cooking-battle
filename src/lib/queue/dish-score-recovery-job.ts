import type { PgBoss } from "pg-boss";
import { startPgBoss } from "@/lib/queue/pg-boss";

export const DISH_SCORE_RECOVERY_JOB_NAME = "dish-score-recovery" as const;
export const DISH_SCORE_RECOVERY_SCHEDULE_KEY = "every-10-minutes" as const;
export const DISH_SCORE_RECOVERY_CRON = "*/10 * * * *" as const;
export const DISH_SCORE_RECOVERY_TZ = "Asia/Seoul" as const;

export type DishScoreRecoveryJobPayload = {
  dayKey?: string;
  limit?: number;
  staleMinutes?: number;
};

type EnqueueDishScoreRecoveryJobOptions = {
  singleton?: boolean;
};

export const DISH_SCORE_RECOVERY_QUEUE_OPTIONS = {
  retryLimit: 1,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 120,
} as const;

export async function ensureDishScoreRecoverySchedule(boss: PgBoss) {
  await boss.createQueue(DISH_SCORE_RECOVERY_JOB_NAME, DISH_SCORE_RECOVERY_QUEUE_OPTIONS);
  await boss.schedule(
    DISH_SCORE_RECOVERY_JOB_NAME,
    DISH_SCORE_RECOVERY_CRON,
    {},
    {
      tz: DISH_SCORE_RECOVERY_TZ,
      key: DISH_SCORE_RECOVERY_SCHEDULE_KEY,
    },
  );
}

export async function enqueueDishScoreRecoveryJob(
  payload: DishScoreRecoveryJobPayload = {},
  options: EnqueueDishScoreRecoveryJobOptions = {},
) {
  const boss = await startPgBoss();
  await boss.createQueue(DISH_SCORE_RECOVERY_JOB_NAME, DISH_SCORE_RECOVERY_QUEUE_OPTIONS);

  const dayKey = payload.dayKey?.toString().trim() ?? "";
  const limit =
    typeof payload.limit === "number" && Number.isFinite(payload.limit) ? payload.limit : undefined;
  const staleMinutes =
    typeof payload.staleMinutes === "number" && Number.isFinite(payload.staleMinutes)
      ? payload.staleMinutes
      : undefined;
  const singleton = options.singleton ?? true;

  return await boss.send(
    DISH_SCORE_RECOVERY_JOB_NAME,
    {
      ...(dayKey ? { dayKey } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(staleMinutes !== undefined ? { staleMinutes } : {}),
    },
    singleton ? { singletonKey: dayKey || "auto-recovery", singletonSeconds: 9 * 60 } : undefined,
  );
}
