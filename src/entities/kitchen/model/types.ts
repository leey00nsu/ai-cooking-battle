export type MyKitchenDish = {
  id: string;
  prompt: string;
  imageUrl: string;
  isHidden: boolean;
  createdAt: string;
  dayScoreToday: number | null;
};

export type MyKitchenResponse =
  | {
      ok: true;
      representativeDishId: string | null;
      isActive: boolean;
      dishes: MyKitchenDish[];
    }
  | {
      ok: false;
      code: string;
      message: string;
    };
