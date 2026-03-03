import type { MatchFeed } from "@/entities/match/model/types";
import { listRankingTop } from "@/entities/ranking/api/list-ranking-top";
import type { RankingTop } from "@/entities/ranking/model/types";
import { getMockMatchFeed } from "@/shared/api/mock-home-data";

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
    return getMockMatchFeed(args.dayKey, args.limit);
  },
  async getRankingTop(args) {
    return listRankingTop(args);
  },
};

// matchFeed는 추후 실제 매치 데이터 연동 시 교체한다.
export function getHomeDataSource(): HomeDataSource {
  return mockHomeDataSource;
}
