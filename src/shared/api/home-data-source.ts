import type { MatchFeed } from "@/entities/match/model/types";
import type { RankingTop } from "@/entities/ranking/model/types";
import { getMockMatchFeed, getMockRankingTop } from "@/shared/api/mock-home-data";

export type HomeDataSource = {
  getMatchFeed(args: { dayKey: string; limit: number }): Promise<MatchFeed>;
  getRankingTop(args: { dayKey: string; count: number }): Promise<RankingTop>;
};

const mockHomeDataSource: HomeDataSource = {
  async getMatchFeed(args) {
    return getMockMatchFeed(args.dayKey, args.limit);
  },
  async getRankingTop(args) {
    return getMockRankingTop(args.dayKey, args.count);
  },
};

// F011+에서 DB 기반 피드/스냅샷 소스로 교체할 때 이 반환값만 교체한다.
export function getHomeDataSource(): HomeDataSource {
  return mockHomeDataSource;
}
