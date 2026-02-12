import { describe, expect, it } from "vitest";
import { getHomeDataSource } from "@/shared/api/home-data-source";

describe("home-data-source", () => {
  it("returns mock match feed via adapter interface", async () => {
    const source = getHomeDataSource();
    const feed = await source.getMatchFeed({ dayKey: "2026-02-08", limit: 3 });

    expect(feed.items).toHaveLength(3);
    expect(feed.items[0]?.dayKey).toBe("2026-02-08");
  });

  it("returns mock ranking via adapter interface", async () => {
    const source = getHomeDataSource();
    const ranking = await source.getRankingTop({ dayKey: "2026-02-08", count: 2 });

    expect(ranking.dayKey).toBe("2026-02-08");
    expect(ranking.items).toHaveLength(2);
  });
});
