import type { PgBoss } from "pg-boss";

import { startPgBoss } from "@/lib/queue/pg-boss";

export const BOT_SEED_JOB_NAME = "bot-seed" as const;

export type BotSeedTriggerType = "SCHEDULE" | "ADMIN";

export type BotSeedJobPayload = {
  dayKey?: string;
  triggerType?: BotSeedTriggerType;
};

export const BOT_SEED_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
} as const;

export async function ensureBotSeedQueue(boss: PgBoss) {
  await boss.createQueue(BOT_SEED_JOB_NAME, BOT_SEED_QUEUE_OPTIONS);
}

export async function enqueueBotSeedJob(payload: BotSeedJobPayload) {
  const boss = await startPgBoss();
  await ensureBotSeedQueue(boss);

  const dayKey = payload.dayKey?.toString().trim() ?? "";
  const triggerType: BotSeedTriggerType = payload.triggerType === "ADMIN" ? "ADMIN" : "SCHEDULE";

  return await boss.send(
    BOT_SEED_JOB_NAME,
    {
      ...(dayKey ? { dayKey } : {}),
      triggerType,
    },
    dayKey ? { singletonKey: dayKey, singletonSeconds: 24 * 60 * 60 } : undefined,
  );
}
