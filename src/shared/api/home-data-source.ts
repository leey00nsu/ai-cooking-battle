import type { MatchFeed } from "@/entities/match/model/types";
import { listRankingTop } from "@/entities/ranking/api/list-ranking-top";
import type { RankingTop } from "@/entities/ranking/model/types";

export type HomeDataSource = {
  getMatchFeed(args: { dayKey: string; limit: number }): Promise<MatchFeed>;
  getRankingTop(args: {
    dayKey: string;
    count: number;
    includeBots?: boolean;
  }): Promise<RankingTop>;
};

const mockHomeDataSource: HomeDataSource = {
  async getMatchFeed(args) {
    const rankingTop = await listRankingTop({
      dayKey: args.dayKey,
      count: args.limit,
      includeBots: true,
    });

    return {
      items: rankingTop.items.map((entry) => ({
        id: entry.dishId,
        dayKey: rankingTop.dayKey,
        leftDishImageUrl: entry.imageUrl,
        rightDishImageUrl: entry.imageUrl,
        leftScore: entry.score,
        rightScore: entry.score,
        isPractice: false,
      })),
    };
  },
  async getRankingTop(args) {
    return listRankingTop(args);
  },
};

export function getHomeDataSource(): HomeDataSource {
  return mockHomeDataSource;
}
