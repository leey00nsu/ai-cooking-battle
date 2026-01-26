export type SnapshotEntry = {
  rank: number;
  dishId: string;
  leftImageUrl: string;
  rightImageUrl: string;
  leftScore: number;
  rightScore: number;
};

export type SnapshotTop = {
  dayKey: string;
  items: SnapshotEntry[];
};
