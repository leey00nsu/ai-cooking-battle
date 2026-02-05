import { describe, expect, it, vi } from "vitest";
import {
  DAY_THEME_PRECREATE_CRON,
  DAY_THEME_PRECREATE_JOB_NAME,
  DAY_THEME_PRECREATE_SCHEDULE_KEY,
  DAY_THEME_PRECREATE_TZ,
  ensureDayThemePrecreateSchedule,
} from "@/lib/queue/day-theme-precreate-job";

describe("ensureDayThemePrecreateSchedule", () => {
  it("creates queue and schedules midnight KST job", async () => {
    const boss = {
      createQueue: vi.fn(),
      schedule: vi.fn(),
    } as unknown as {
      createQueue: (name: string, options: unknown) => Promise<void>;
      schedule: (name: string, cron: string, data: unknown, options: unknown) => Promise<void>;
    };

    await ensureDayThemePrecreateSchedule(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(DAY_THEME_PRECREATE_JOB_NAME, expect.any(Object));
    expect(boss.schedule).toHaveBeenCalledWith(
      DAY_THEME_PRECREATE_JOB_NAME,
      DAY_THEME_PRECREATE_CRON,
      {},
      expect.objectContaining({
        tz: DAY_THEME_PRECREATE_TZ,
        key: DAY_THEME_PRECREATE_SCHEDULE_KEY,
      }),
    );
  });
});
