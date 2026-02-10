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

export type DishDayScore = {
  id: string;
  dishId: string;
  dayKey: string;
  totalScore: number;
  createdAt: string;
  updatedAt: string;
};
