import type { MatchSummary } from "@/entities/match/model/types";

type KitchenStats = {
  dishes: number;
  winRate: number | null;
  streak: number | null;
};

function isWinMatch(match: MatchSummary) {
  // 배틀 규칙상 동점은 발생하지 않는다.
  return match.leftScore > match.rightScore;
}

function computeKitchenStats(dishes: number, recentMatches: MatchSummary[]): KitchenStats {
  if (recentMatches.length === 0) {
    return { dishes, winRate: null, streak: null };
  }

  const wins = recentMatches.filter(isWinMatch).length;
  const winRate = Math.round((wins / recentMatches.length) * 100);

  let streak = 0;
  for (const match of recentMatches) {
    if (isWinMatch(match)) {
      streak += 1;
      continue;
    }
    break;
  }

  return { dishes, winRate, streak };
}

export { computeKitchenStats };
export type { KitchenStats };
