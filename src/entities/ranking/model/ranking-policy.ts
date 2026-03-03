import type { Prisma } from "@prisma/client";

export const RANKING_TIE_BREAK_ORDER = [
  { totalScore: "desc" },
  { themeFit: "desc" },
  { execution: "desc" },
  { analyzedAt: "desc" },
  { id: "desc" },
] as const;

export function getRankingOrderBy(): Prisma.DishDayScoreOrderByWithRelationInput[] {
  return [...RANKING_TIE_BREAK_ORDER];
}

export const RANKING_SQL_ORDER_BY = `
  dds."totalScore" DESC,
  dds."themeFit" DESC,
  dds."execution" DESC,
  dds."analyzedAt" DESC,
  dds."id" DESC
`;

export function getPublicRankingDishWhere(args?: { includeBots?: boolean }): Prisma.DishWhereInput {
  if (args?.includeBots) {
    return { isHidden: false };
  }
  return {
    isHidden: false,
    botMeta: null,
  };
}
