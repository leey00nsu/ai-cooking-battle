import type { PgBoss } from "pg-boss";
import { startPgBoss } from "@/lib/queue/pg-boss";

export const DISH_SCORE_JOB_NAME = "dish-score" as const;

export type DishScoreJobPayload = {
  dishId: string;
  dayKey: string;
};

type EnqueueDishScoreJobOptions = {
  singleton?: boolean;
};

export const DISH_SCORE_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
} as const;

export async function ensureDishScoreQueue(boss: PgBoss) {
  await boss.createQueue(DISH_SCORE_JOB_NAME, DISH_SCORE_QUEUE_OPTIONS);
}

export async function enqueueDishScoreJob(
  payload: DishScoreJobPayload,
  options: EnqueueDishScoreJobOptions = {},
) {
  const dishId = payload.dishId?.toString().trim() ?? "";
  const dayKey = payload.dayKey?.toString().trim() ?? "";
  if (!dishId || !dayKey) {
    throw new Error("[dish-score-job] dishId and dayKey are required.");
  }

  const boss = await startPgBoss();
  await ensureDishScoreQueue(boss);

  const singleton = options.singleton ?? true;
  const singletonKey = `${dayKey}:${dishId}`;

  return await boss.send(
    DISH_SCORE_JOB_NAME,
    { dishId, dayKey },
    singleton ? { singletonKey, singletonSeconds: 24 * 60 * 60 } : undefined,
  );
}
