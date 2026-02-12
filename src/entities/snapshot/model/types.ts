export type SnapshotEntry = {
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

export type SnapshotTop = {
  dayKey: string;
  items: SnapshotEntry[];
};
