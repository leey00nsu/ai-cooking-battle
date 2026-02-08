import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DAY_THEME_PRECREATE_CRON,
  DAY_THEME_PRECREATE_JOB_NAME,
  DAY_THEME_PRECREATE_QUEUE_OPTIONS,
  DAY_THEME_PRECREATE_SCHEDULE_KEY,
  DAY_THEME_PRECREATE_TZ,
  enqueueDayThemePrecreateJob,
  ensureDayThemePrecreateSchedule,
} from "@/lib/queue/day-theme-precreate-job";

const startPgBoss = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queue/pg-boss", () => ({ startPgBoss }));

describe("day-theme-precreate-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates queue and schedules midnight KST job", async () => {
    const boss = {
      createQueue: vi.fn(),
      schedule: vi.fn(),
    } as unknown as {
      createQueue: (name: string, options: unknown) => Promise<void>;
      schedule: (name: string, cron: string, data: unknown, options: unknown) => Promise<void>;
    };

    await ensureDayThemePrecreateSchedule(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(
      DAY_THEME_PRECREATE_JOB_NAME,
      DAY_THEME_PRECREATE_QUEUE_OPTIONS,
    );
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

  it("enqueues singleton job by default", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDayThemePrecreateJob({ dayKey: "2026-02-08" });

    expect(boss.createQueue).toHaveBeenCalledWith(
      DAY_THEME_PRECREATE_JOB_NAME,
      DAY_THEME_PRECREATE_QUEUE_OPTIONS,
    );
    expect(boss.send).toHaveBeenCalledWith(
      DAY_THEME_PRECREATE_JOB_NAME,
      { dayKey: "2026-02-08" },
      { singletonKey: "2026-02-08", singletonSeconds: 24 * 60 * 60 },
    );
  });

  it("can enqueue force job without singleton lock", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDayThemePrecreateJob({ dayKey: "2026-02-08", force: true }, { singleton: false });

    expect(boss.send).toHaveBeenCalledWith(
      DAY_THEME_PRECREATE_JOB_NAME,
      { dayKey: "2026-02-08", force: true },
      undefined,
    );
  });
});
