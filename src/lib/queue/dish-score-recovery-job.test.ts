import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISH_SCORE_RECOVERY_CRON,
  DISH_SCORE_RECOVERY_JOB_NAME,
  DISH_SCORE_RECOVERY_QUEUE_OPTIONS,
  DISH_SCORE_RECOVERY_SCHEDULE_KEY,
  DISH_SCORE_RECOVERY_TZ,
  enqueueDishScoreRecoveryJob,
  ensureDishScoreRecoverySchedule,
} from "@/lib/queue/dish-score-recovery-job";

const startPgBoss = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queue/pg-boss", () => ({ startPgBoss }));

describe("dish-score-recovery-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates queue and schedules 10-minute watchdog job", async () => {
    const boss = {
      createQueue: vi.fn(),
      schedule: vi.fn(),
    } as unknown as {
      createQueue: (name: string, options: unknown) => Promise<void>;
      schedule: (name: string, cron: string, data: unknown, options: unknown) => Promise<void>;
    };

    await ensureDishScoreRecoverySchedule(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(
      DISH_SCORE_RECOVERY_JOB_NAME,
      DISH_SCORE_RECOVERY_QUEUE_OPTIONS,
    );
    expect(boss.schedule).toHaveBeenCalledWith(
      DISH_SCORE_RECOVERY_JOB_NAME,
      DISH_SCORE_RECOVERY_CRON,
      {},
      expect.objectContaining({
        tz: DISH_SCORE_RECOVERY_TZ,
        key: DISH_SCORE_RECOVERY_SCHEDULE_KEY,
      }),
    );
  });

  it("enqueues singleton recovery job by default", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDishScoreRecoveryJob({ dayKey: "2026-02-12", limit: 50, staleMinutes: 15 });

    expect(boss.createQueue).toHaveBeenCalledWith(
      DISH_SCORE_RECOVERY_JOB_NAME,
      DISH_SCORE_RECOVERY_QUEUE_OPTIONS,
    );
    expect(boss.send).toHaveBeenCalledWith(
      DISH_SCORE_RECOVERY_JOB_NAME,
      { dayKey: "2026-02-12", limit: 50, staleMinutes: 15 },
      { singletonKey: "2026-02-12", singletonSeconds: 9 * 60 },
    );
  });

  it("can enqueue without singleton lock", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDishScoreRecoveryJob({}, { singleton: false });

    expect(boss.send).toHaveBeenCalledWith(DISH_SCORE_RECOVERY_JOB_NAME, {}, undefined);
  });
});
