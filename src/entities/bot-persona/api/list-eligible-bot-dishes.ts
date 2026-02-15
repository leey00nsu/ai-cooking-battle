import type { BotSeedRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const FINALIZED_SEED_RUN_STATUSES: BotSeedRunStatus[] = ["SUCCEEDED", "FAILED_PARTIAL"];

export type EligibleBotDish = {
  dishId: string;
  imageUrl: string;
  prompt: string;
  promptEn: string | null;
  personaKey: string;
  personaDisplayName: string;
  selectedOrder: number;
  dayScore: number | null;
  seedRunId: string;
};

export async function listEligibleBotDishes(dayKey: string): Promise<EligibleBotDish[]> {
  const normalizedDayKey = dayKey.toString().trim();
  if (!normalizedDayKey) {
    return [];
  }

  const items = await prisma.botSeedItem.findMany({
    where: {
      status: "SUCCEEDED",
      dishId: { not: null },
      seedRun: {
        dayKey: normalizedDayKey,
        status: { in: FINALIZED_SEED_RUN_STATUSES },
      },
      dish: {
        is: {
          isHidden: false,
        },
      },
    },
    orderBy: [{ selectedOrder: "asc" }, { attempt: "desc" }],
    select: {
      dishId: true,
      selectedOrder: true,
      personaKey: true,
      seedRunId: true,
      persona: {
        select: {
          displayName: true,
        },
      },
      dish: {
        select: {
          imageUrl: true,
          dishName: true,
          dishNameEn: true,
          prompt: true,
          promptEn: true,
          dayScores: {
            where: { dayKey: normalizedDayKey },
            select: { totalScore: true },
            take: 1,
          },
        },
      },
    },
  });

  const selectedOrders = new Set<number>();
  return items
    .filter(
      (item): item is typeof item & { dishId: string; dish: NonNullable<typeof item.dish> } => {
        return Boolean(item.dishId && item.dish);
      },
    )
    .filter((item) => {
      if (selectedOrders.has(item.selectedOrder)) {
        return false;
      }
      selectedOrders.add(item.selectedOrder);
      return true;
    })
    .map((item) => ({
      dishId: item.dishId,
      imageUrl: item.dish.imageUrl,
      prompt: item.dish.dishName || item.dish.prompt,
      promptEn: item.dish.dishNameEn || item.dish.promptEn,
      personaKey: item.personaKey,
      personaDisplayName: item.persona.displayName,
      selectedOrder: item.selectedOrder,
      dayScore: item.dish.dayScores[0]?.totalScore ?? null,
      seedRunId: item.seedRunId,
    }));
}
