import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dayTheme: {
    findUnique: vi.fn(),
  },
  dishDayScore: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("listRankingArchive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns archive payload with summary and nextOffset", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      themeText: "비 오는 날에 어울리는 매콤한 국물 음식",
      axisA: "비 오는 날",
      axisB: "국물 음식",
      axisFlavor: "매콤한",
    });
    prisma.dishDayScore.aggregate.mockResolvedValueOnce({
      _count: { _all: 42 },
      _avg: { totalScore: 86.55 },
    });
    prisma.dishDayScore.findMany
      .mockResolvedValueOnce([
        {
          dishId: "dish-1",
          totalScore: 95.1,
          dish: {
            dishName: "매콤 버터 마늘 라멘",
            imageUrl: "https://cdn.example/dish-1.webp",
            user: { name: "Chef A" },
            botMeta: null,
          },
        },
        {
          dishId: "dish-2",
          totalScore: 92.4,
          dish: {
            dishName: "유자 칠리 치킨 누들",
            imageUrl: "https://cdn.example/dish-2.webp",
            user: { name: "Chef B" },
            botMeta: {
              persona: {
                displayName: "트리플 실루엣",
              },
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        { dish: { dishName: "매콤 버터 마늘 라멘" } },
        { dish: { dishName: "유자 칠리 치킨 누들" } },
      ]);

    const { listRankingArchive } = await import("./list-ranking-archive");
    const result = await listRankingArchive({
      dayKey: "2026-02-12",
      limit: 1,
      offset: 0,
    });

    expect(result.dayKey).toBe("2026-02-12");
    expect(result.themeText).toBe("비 오는 날에 어울리는 매콤한 국물 음식");
    expect(result.participantCount).toBe(42);
    expect(result.averageScore).toBe(86.55);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      rank: 1,
      dishId: "dish-1",
      dishName: "매콤 버터 마늘 라멘",
    });
    expect(result.nextOffset).toBe(1);
    expect(result.keywordGroups.length).toBeGreaterThan(0);
  });

  it("returns empty payload when dayKey is blank", async () => {
    const { listRankingArchive } = await import("./list-ranking-archive");
    const result = await listRankingArchive({ dayKey: "   " });

    expect(result).toEqual({
      dayKey: "",
      themeText: "",
      participantCount: 0,
      averageScore: 0,
      keywordGroups: [],
      items: [],
      nextOffset: null,
    });
    expect(prisma.dayTheme.findUnique).not.toHaveBeenCalled();
  });
});
