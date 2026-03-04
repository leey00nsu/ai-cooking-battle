import type { MatchSummary } from "@/entities/match/model/types";

type KitchenStats = {
  dishes: number;
  winRate: number | null;
  streak: number | null;
};

function isWinMatch(match: MatchSummary) {
  // 동점(랭킹 스냅샷) 데이터는 별도 처리하고, 승패 판정은 결정적 결과만 계산한다.
  return match.leftScore > match.rightScore;
}

function computeKitchenStats(dishes: number, recentMatches: MatchSummary[]): KitchenStats {
  if (recentMatches.length === 0) {
    return { dishes, winRate: null, streak: null };
  }

  const decisiveMatches = recentMatches.filter((match) => match.leftScore !== match.rightScore);
  if (decisiveMatches.length === 0) {
    return { dishes, winRate: null, streak: null };
  }

  const wins = decisiveMatches.filter(isWinMatch).length;
  const winRate = Math.round((wins / decisiveMatches.length) * 100);

  let streak = 0;
  for (const match of recentMatches) {
    if (match.leftScore === match.rightScore) {
      continue;
    }
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
