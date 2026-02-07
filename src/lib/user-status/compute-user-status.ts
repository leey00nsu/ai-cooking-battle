import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export type UserStatus = "AUTH" | "ELIGIBLE";

export async function computeUserStatus(userId: string): Promise<UserStatus> {
  const trimmedUserId = userId.trim();
  if (!trimmedUserId) {
    return "AUTH";
  }

  const dayKey = formatDayKeyForKST();

  const user = await prisma.user.findUnique({
    where: { id: trimmedUserId },
    select: { representativeDishId: true },
  });
  const representativeDishId = user?.representativeDishId ?? null;
  if (!representativeDishId) {
    return "AUTH";
  }

  const activeEntry = await prisma.activeEntry.findUnique({
    where: { userId: trimmedUserId },
    select: { isActive: true },
  });
  if (!activeEntry?.isActive) {
    return "AUTH";
  }

  const dish = await prisma.dish.findFirst({
    where: { id: representativeDishId, userId: trimmedUserId },
    select: { id: true, isHidden: true },
  });
  if (!dish || dish.isHidden) {
    return "AUTH";
  }

  const dayScore = await prisma.dishDayScore.findUnique({
    where: {
      dishId_dayKey: {
        dishId: dish.id,
        dayKey,
      },
    },
    select: { id: true },
  });

  return dayScore ? "ELIGIBLE" : "AUTH";
}
