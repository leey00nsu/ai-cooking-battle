import { prisma } from "@/lib/prisma";

export async function findDishById(dishId: string) {
  return prisma.dish.findUnique({ where: { id: dishId } });
}

export async function findDishDayScore(dishId: string, dayKey: string) {
  return prisma.dishDayScore.findUnique({
    where: {
      dishId_dayKey: {
        dishId,
        dayKey,
      },
    },
  });
}
