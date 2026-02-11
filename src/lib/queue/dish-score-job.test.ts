import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISH_SCORE_JOB_NAME,
  DISH_SCORE_QUEUE_OPTIONS,
  enqueueDishScoreJob,
  ensureDishScoreQueue,
} from "@/lib/queue/dish-score-job";

const startPgBoss = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queue/pg-boss", () => ({ startPgBoss }));

describe("dish-score-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates dish-score queue with shared queue options", async () => {
    const boss = {
      createQueue: vi.fn(),
    } as unknown as {
      createQueue: (name: string, options: unknown) => Promise<void>;
    };

    await ensureDishScoreQueue(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(DISH_SCORE_JOB_NAME, DISH_SCORE_QUEUE_OPTIONS);
  });

  it("enqueues singleton job with dishId+dayKey key", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" });

    expect(boss.createQueue).toHaveBeenCalledWith(DISH_SCORE_JOB_NAME, DISH_SCORE_QUEUE_OPTIONS);
    expect(boss.send).toHaveBeenCalledWith(
      DISH_SCORE_JOB_NAME,
      { dishId: "dish-1", dayKey: "2026-02-10" },
      { singletonKey: "2026-02-10:dish-1", singletonSeconds: 24 * 60 * 60 },
    );
  });

  it("can enqueue without singleton lock", async () => {
    const boss = {
      createQueue: vi.fn(),
      send: vi.fn(),
    };
    startPgBoss.mockResolvedValueOnce(boss);

    await enqueueDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" }, { singleton: false });

    expect(boss.send).toHaveBeenCalledWith(
      DISH_SCORE_JOB_NAME,
      { dishId: "dish-1", dayKey: "2026-02-10" },
      undefined,
    );
  });

  it("throws when dishId/dayKey are missing", async () => {
    await expect(enqueueDishScoreJob({ dishId: " ", dayKey: "2026-02-10" })).rejects.toThrow(
      "[dish-score-job] dishId and dayKey are required.",
    );
    await expect(enqueueDishScoreJob({ dishId: "dish-1", dayKey: "" })).rejects.toThrow(
      "[dish-score-job] dishId and dayKey are required.",
    );
  });
});
