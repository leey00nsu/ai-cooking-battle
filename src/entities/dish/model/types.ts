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

export type DishDetail = {
  dish: {
    id: string;
    imageUrl: string;
    dishName: string;
    dishNameEn: string | null;
    createdAt: string;
  };
  author: {
    type: "user" | "bot";
    displayName: string;
    userId: string | null;
    personaId: string | null;
  };
  theme: {
    dayKey: string | null;
    themeText: string | null;
  };
  score: {
    status: "ready" | "pending";
    total: number | null;
    themeFit: number | null;
    execution: number | null;
    oneLiner: string | null;
    reasons: string[] | null;
    tip: string | null;
  };
};

export type DishDetailResponse =
  | ({ ok: true } & DishDetail)
  | {
      ok: false;
      code: "INVALID_DISH_ID" | "DISH_NOT_FOUND" | "DISH_RESTRICTED" | "INTERNAL_ERROR";
      message: string;
    };
