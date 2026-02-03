export type Dish = {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  isHidden: boolean;
  createdAt: string;
};

export type DishDayScore = {
  id: string;
  dishId: string;
  dayKey: string;
  totalScore: number;
  createdAt: string;
};
