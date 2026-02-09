import type { MatchFeed } from "@/entities/match/model/types";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import { getMockMatchFeed, getMockSnapshotTop } from "@/shared/api/mock-home-data";

export type HomeDataSource = {
  getMatchFeed(args: { dayKey: string; limit: number }): Promise<MatchFeed>;
  getSnapshotTop(args: { dayKey: string; count: number }): Promise<SnapshotTop>;
};

const mockHomeDataSource: HomeDataSource = {
  async getMatchFeed(args) {
    return getMockMatchFeed(args.dayKey, args.limit);
  },
  async getSnapshotTop(args) {
    return getMockSnapshotTop(args.dayKey, args.count);
  },
};

// F011+에서 DB 기반 피드/스냅샷 소스로 교체할 때 이 반환값만 교체한다.
export function getHomeDataSource(): HomeDataSource {
  return mockHomeDataSource;
}
