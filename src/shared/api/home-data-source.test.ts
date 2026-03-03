import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHomeDataSource } from "@/shared/api/home-data-source";

const { listRankingTopMock } = vi.hoisted(() => ({
  listRankingTopMock: vi.fn(),
}));

vi.mock("@/entities/ranking/api/list-ranking-top", () => ({
  listRankingTop: listRankingTopMock,
}));

describe("home-data-source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ranking-derived feed via adapter interface", async () => {
    listRankingTopMock.mockResolvedValueOnce({
      dayKey: "2026-02-08",
      items: [
        {
          rank: 1,
          dishId: "dish-1",
          dishName: "dish",
          authorName: "Chef A",
          imageUrl: "https://cdn.example/dish-1.webp",
          score: 91,
          leftImageUrl: "https://cdn.example/dish-1-left.webp",
          rightImageUrl: "https://cdn.example/dish-1-right.webp",
          leftScore: 9.1,
          rightScore: 8.7,
        },
      ],
    });

    const source = getHomeDataSource();
    const feed = await source.getMatchFeed({ dayKey: "2026-02-08", limit: 3 });

    expect(listRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-08",
      count: 3,
      includeBots: false,
    });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.dayKey).toBe("2026-02-08");
    expect(feed.items[0]?.id).toBe("dish-1");
  });

  it("returns DB ranking via adapter interface", async () => {
    listRankingTopMock.mockResolvedValueOnce({
      dayKey: "2026-02-08",
      items: [
        {
          rank: 1,
          dishId: "dish-1",
          dishName: "dish",
          authorName: "Chef A",
          imageUrl: "https://cdn.example/dish-1.webp",
          score: 91,
          leftImageUrl: "https://cdn.example/dish-1.webp",
          rightImageUrl: "https://cdn.example/dish-1.webp",
          leftScore: 91,
          rightScore: 91,
        },
      ],
    });
    const source = getHomeDataSource();
    const ranking = await source.getRankingTop({ dayKey: "2026-02-08", count: 2 });

    expect(listRankingTopMock).toHaveBeenCalledWith({
      dayKey: "2026-02-08",
      count: 2,
    });
    expect(ranking.dayKey).toBe("2026-02-08");
    expect(ranking.items).toHaveLength(1);
  });
});
