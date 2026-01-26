export type MatchSummary = {
  id: string;
  dayKey: string;
  leftDishImageUrl: string;
  rightDishImageUrl: string;
  leftScore: number;
  rightScore: number;
  isPractice: boolean;
};

export type MatchFeed = {
  items: MatchSummary[];
};
