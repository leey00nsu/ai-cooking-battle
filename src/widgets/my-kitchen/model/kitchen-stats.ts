import type { MatchSummary } from "@/entities/match/model/types";

type KitchenStats = {
  dishes: number;
  winRate: number | null;
  streak: number | null;
};

function computeKitchenStats(dishes: number, recentMatches: MatchSummary[]): KitchenStats {
  if (recentMatches.length === 0) {
    return { dishes, winRate: null, streak: null };
  }

  const wins = recentMatches.filter((match) => match.leftScore >= match.rightScore).length;
  const winRate = Math.round((wins / recentMatches.length) * 100);

  let streak = 0;
  for (const match of recentMatches) {
    if (match.leftScore >= match.rightScore) {
      streak += 1;
      continue;
    }
    break;
  }

  return { dishes, winRate, streak };
}

export { computeKitchenStats };
export type { KitchenStats };
