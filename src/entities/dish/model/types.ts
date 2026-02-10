export type Dish = {
  id: string;
  userId: string;
  dishName: string;
  dishNameEn: string | null;
  prompt: string;
  promptEn: string | null;
  imageUrl: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DishDayScoreStatus = "PENDING" | "READY" | "FAILED";

export type DishDayScore = {
  id: string;
  dishId: string;
  dayKey: string;
  totalScore: number;
  themeFit: number;
  execution: number;
  oneLiner: string | null;
  reasons: string[] | null;
  tip: string | null;
  status: DishDayScoreStatus;
  analyzedAt: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DishReport = {
  id: string;
  reporterId: string;
  targetDishId: string;
  reason: string;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
};
