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

export type RankingKeywordGroup = {
  title: string;
  keywords: string[];
};

export type RankingArchiveResponse = {
  dayKey: string;
  themeText: string;
  participantCount: number;
  averageScore: number;
  keywordGroups: RankingKeywordGroup[];
  items: RankingEntry[];
  nextOffset: number | null;
};
