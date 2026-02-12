export type RankingEntry = {
  rank: number;
  dishId: string;
  dishName: string;
  authorName: string;
  imageUrl: string;
  score: number;
  leftImageUrl: string;
  rightImageUrl: string;
  leftScore: number;
  rightScore: number;
};

export type RankingTop = {
  dayKey: string;
  items: RankingEntry[];
};
