import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dishDayScore: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("listRankingTop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries READY scores for a day and maps ranking payload", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([
      {
        dishId: "dish-1",
        totalScore: 91.2,
        dish: {
          dishName: "훈연 버터 치킨 구이",
          imageUrl: "https://cdn.example/dish-1.webp",
          user: { name: "Chef A" },
          botMeta: null,
        },
      },
      {
        dishId: "dish-2",
        totalScore: 88.6,
        dish: {
          dishName: "유자 간장 두부 스테이크",
          imageUrl: "https://cdn.example/dish-2.webp",
          user: { name: "Chef B" },
          botMeta: {
            persona: { displayName: "트리플 실루엣" },
          },
        },
      },
    ]);

    const { listRankingTop } = await import("./list-ranking-top");
    const result = await listRankingTop({ dayKey: "2026-02-12", count: 2 });

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dayKey: "2026-02-12",
          status: "READY",
          dish: {
            isHidden: false,
          },
        },
        orderBy: [
          { totalScore: "desc" },
          { themeFit: "desc" },
          { execution: "desc" },
          { analyzedAt: "desc" },
          { id: "desc" },
        ],
        take: 2,
      }),
    );
    expect(result).toEqual({
      dayKey: "2026-02-12",
      items: [
        {
          rank: 1,
          dishId: "dish-1",
          dishName: "훈연 버터 치킨 구이",
          authorName: "Chef A",
          imageUrl: "https://cdn.example/dish-1.webp",
          score: 91.2,
        },
        {
          rank: 2,
          dishId: "dish-2",
          dishName: "유자 간장 두부 스테이크",
          authorName: "트리플 실루엣",
          imageUrl: "https://cdn.example/dish-2.webp",
          score: 88.6,
        },
      ],
    });
  });

  it("returns empty result when dayKey is blank", async () => {
    const { listRankingTop } = await import("./list-ranking-top");
    const result = await listRankingTop({ dayKey: "   ", count: 10 });

    expect(result).toEqual({
      dayKey: "",
      items: [],
    });
    expect(prisma.dishDayScore.findMany).not.toHaveBeenCalled();
  });

  it("excludes bot dishes only when includeBots=false", async () => {
    prisma.dishDayScore.findMany.mockResolvedValueOnce([]);

    const { listRankingTop } = await import("./list-ranking-top");
    await listRankingTop({ dayKey: "2026-02-12", includeBots: false });

    expect(prisma.dishDayScore.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dayKey: "2026-02-12",
          status: "READY",
          dish: {
            isHidden: false,
            botMeta: null,
          },
        },
      }),
    );
  });
});
