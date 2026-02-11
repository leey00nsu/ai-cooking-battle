import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueDishScoreJobMock = vi.fn();
const formatDayKeyForKSTMock = vi.fn(() => "2026-02-12");

const prisma = {
  dishDayScore: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/queue/dish-score-job", () => ({
  enqueueDishScoreJob: enqueueDishScoreJobMock,
}));
vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: formatDayKeyForKSTMock,
}));

describe("requeueDishScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.dishDayScore.findMany.mockResolvedValue([]);
    enqueueDishScoreJobMock.mockResolvedValue("job-1");
  });

  it("returns INVALID_DAY_KEY when dayKey format is invalid", async () => {
    const { requeueDishScores } = await import("./requeue-dish-scores");

    const result = await requeueDishScores({ dayKey: "20260212" });

    expect(result).toEqual({
      type: "error",
      status: 400,
      code: "INVALID_DAY_KEY",
      message: "dayKey format must be YYYY-MM-DD.",
    });
    expect(prisma.dishDayScore.findMany).not.toHaveBeenCalled();
  });

  it("returns INVALID_LIMIT when limit is out of range", async () => {
    const { requeueDishScores } = await import("./requeue-dish-scores");

    const result = await requeueDishScores({ limit: 0 });

    expect(result).toEqual({
      type: "error",
      status: 400,
      code: "INVALID_LIMIT",
      message: "limit must be an integer between 1 and 500.",
    });
    expect(prisma.dishDayScore.findMany).not.toHaveBeenCalled();
  });

  it("returns INVALID_DISH_ID when dishId format is invalid", async () => {
    const { requeueDishScores } = await import("./requeue-dish-scores");

    const result = await requeueDishScores({ dayKey: "2026-02-12", dishId: "ab" });

    expect(result).toEqual({
      type: "error",
      status: 400,
      code: "INVALID_DISH_ID",
      message: "dishId format is invalid.",
    });
    expect(prisma.dishDayScore.findMany).not.toHaveBeenCalled();
  });

  it("finds pending/failed unanalyzed targets and enqueues with singleton=false", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { dishId: "dish-2", dayKey: "2026-02-12" },
    ]);

    const { requeueDishScores } = await import("./requeue-dish-scores");
    const result = await requeueDishScores({ limit: 2 });

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith({
      where: {
        dayKey: "2026-02-12",
        status: { in: ["PENDING", "FAILED"] },
        analyzedAt: null,
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
      take: 2,
      select: { dishId: true, dayKey: true },
    });
    expect(enqueueDishScoreJobMock).toHaveBeenNthCalledWith(
      1,
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { singleton: false },
    );
    expect(enqueueDishScoreJobMock).toHaveBeenNthCalledWith(
      2,
      { dishId: "dish-2", dayKey: "2026-02-12" },
      { singleton: false },
    );
    expect(result).toEqual({
      type: "ok",
      dayKey: "2026-02-12",
      requested: 2,
      enqueued: 2,
      skipped: 0,
      failed: 0,
    });
  });

  it("counts failed enqueue attempts", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      { dishId: "dish-1", dayKey: "2026-02-12" },
      { dishId: "dish-2", dayKey: "2026-02-12" },
    ]);
    enqueueDishScoreJobMock
      .mockResolvedValueOnce("job-1")
      .mockRejectedValueOnce(new Error("queue down"));

    const { requeueDishScores } = await import("./requeue-dish-scores");
    const result = await requeueDishScores({});

    expect(formatDayKeyForKSTMock).toHaveBeenCalled();
    expect(result).toEqual({
      type: "ok",
      dayKey: "2026-02-12",
      requested: 2,
      enqueued: 1,
      skipped: 0,
      failed: 1,
    });
  });

  it("requeues only target dishId when specified", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      { dishId: "dish-123", dayKey: "2026-02-12" },
    ]);

    const { requeueDishScores } = await import("./requeue-dish-scores");
    const result = await requeueDishScores({ dayKey: "2026-02-12", dishId: "dish-123", limit: 99 });

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith({
      where: {
        dishId: "dish-123",
        dayKey: "2026-02-12",
        status: { in: ["PENDING", "FAILED"] },
        analyzedAt: null,
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
      take: 1,
      select: { dishId: true, dayKey: true },
    });
    expect(enqueueDishScoreJobMock).toHaveBeenCalledWith(
      { dishId: "dish-123", dayKey: "2026-02-12" },
      { singleton: false },
    );
    expect(result).toEqual({
      type: "ok",
      dayKey: "2026-02-12",
      requested: 1,
      enqueued: 1,
      skipped: 0,
      failed: 0,
    });
  });
});
