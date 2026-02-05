import type { PgBoss } from "pg-boss";

export const DAY_THEME_PRECREATE_JOB_NAME = "day-theme-precreate" as const;
export const DAY_THEME_PRECREATE_SCHEDULE_KEY = "kst-midnight" as const;
export const DAY_THEME_PRECREATE_CRON = "0 0 * * *" as const;
export const DAY_THEME_PRECREATE_TZ = "Asia/Seoul" as const;

export type DayThemePrecreateJobPayload = {
  dayKey?: string;
};

export const DAY_THEME_PRECREATE_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 300,
} as const;

export async function ensureDayThemePrecreateSchedule(boss: PgBoss) {
  await boss.createQueue(DAY_THEME_PRECREATE_JOB_NAME, DAY_THEME_PRECREATE_QUEUE_OPTIONS);
  await boss.schedule(
    DAY_THEME_PRECREATE_JOB_NAME,
    DAY_THEME_PRECREATE_CRON,
    {},
    {
      tz: DAY_THEME_PRECREATE_TZ,
      key: DAY_THEME_PRECREATE_SCHEDULE_KEY,
    },
  );
}
