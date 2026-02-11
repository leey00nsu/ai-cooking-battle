import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enqueueDishScoreJob = vi.fn();
const formatDayKeyForKST = vi.fn((date?: Date) =>
  date ? date.toISOString().slice(0, 10) : "2026-02-12",
);

const prisma = {
  dishDayScore: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/queue/dish-score-job", () => ({ enqueueDishScoreJob }));
vi.mock("@/shared/lib/day-key", () => ({ formatDayKeyForKST }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("processDishScoreRecoveryJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    prisma.dishDayScore.findMany.mockResolvedValue([]);
    enqueueDishScoreJob.mockResolvedValue("job-1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queries stale pending/failed scores for a specific dayKey", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { dishId: "dish-2", dayKey: "2026-02-12" },
    ]);

    const { processDishScoreRecoveryJob } = await import("./dish-score-recovery-handler");
    const result = await processDishScoreRecoveryJob({
      dayKey: "2026-02-12",
      limit: 2,
      staleMinutes: 15,
    });

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith({
      where: {
        dayKey: { gte: "2026-02-12", lte: "2026-02-12" },
        status: { in: ["PENDING", "FAILED"] },
        analyzedAt: null,
        updatedAt: { lte: expect.any(Date) },
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
      take: 2,
      select: { dishId: true, dayKey: true },
    });
    expect(enqueueDishScoreJob).toHaveBeenNthCalledWith(
      1,
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { singleton: false },
    );
    expect(enqueueDishScoreJob).toHaveBeenNthCalledWith(
      2,
      { dishId: "dish-2", dayKey: "2026-02-12" },
      { singleton: false },
    );
    expect(result).toEqual({
      dayKeyFrom: "2026-02-12",
      dayKeyTo: "2026-02-12",
      requested: 2,
      enqueued: 2,
      skipped: 0,
      failed: 0,
      limit: 2,
      staleMinutes: 15,
    });
  });

  it("uses lookback range and env defaults when dayKey is omitted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T12:00:00.000Z"));
    vi.stubEnv("DISH_SCORE_RECOVERY_LIMIT", "50");
    vi.stubEnv("DISH_SCORE_RECOVERY_STALE_MINUTES", "30");
    vi.stubEnv("DISH_SCORE_RECOVERY_LOOKBACK_DAYS", "2");

    const { processDishScoreRecoveryJob } = await import("./dish-score-recovery-handler");
    const result = await processDishScoreRecoveryJob({});

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dayKey: { gte: "2026-02-11", lte: "2026-02-12" },
        }),
        take: 50,
      }),
    );
    expect(result).toEqual({
      dayKeyFrom: "2026-02-11",
      dayKeyTo: "2026-02-12",
      requested: 0,
      enqueued: 0,
      skipped: 0,
      failed: 0,
      limit: 50,
      staleMinutes: 30,
    });
  });

  it("throws when dayKey format is invalid", async () => {
    const { processDishScoreRecoveryJob } = await import("./dish-score-recovery-handler");

    await expect(processDishScoreRecoveryJob({ dayKey: "20260212" })).rejects.toThrow(
      "[dish-score-recovery] dayKey format must be YYYY-MM-DD.",
    );
  });

  it("counts skipped/failed enqueue results", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { dishId: "dish-2", dayKey: "2026-02-12" },
      { dishId: "dish-3", dayKey: "2026-02-12" },
    ]);
    enqueueDishScoreJob
      .mockResolvedValueOnce("job-1")
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("queue down"));

    const { processDishScoreRecoveryJob } = await import("./dish-score-recovery-handler");
    const result = await processDishScoreRecoveryJob({ dayKey: "2026-02-12", limit: 3 });

    expect(result).toEqual({
      dayKeyFrom: "2026-02-12",
      dayKeyTo: "2026-02-12",
      requested: 3,
      enqueued: 1,
      skipped: 1,
      failed: 1,
      limit: 3,
      staleMinutes: 10,
    });
  });
});
