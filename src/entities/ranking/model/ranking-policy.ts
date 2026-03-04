import type { Prisma } from "@prisma/client";

const RANKING_ORDER_SPEC = [
  { field: "totalScore", sql: `dds."totalScore"` },
  { field: "themeFit", sql: `dds."themeFit"` },
  { field: "execution", sql: `dds."execution"` },
  { field: "analyzedAt", sql: `dds."analyzedAt"` },
  { field: "id", sql: `dds."id"` },
] as const;

export const RANKING_TIE_BREAK_ORDER: ReadonlyArray<Prisma.DishDayScoreOrderByWithRelationInput> =
  RANKING_ORDER_SPEC.map(({ field }) => ({ [field]: "desc" }));

export function getRankingOrderBy(): Prisma.DishDayScoreOrderByWithRelationInput[] {
  return [...RANKING_TIE_BREAK_ORDER];
}

export const RANKING_SQL_ORDER_BY = RANKING_ORDER_SPEC.map(({ sql }) => `${sql} DESC`).join(", ");

export function getPublicRankingDishWhere(args?: { includeBots?: boolean }): Prisma.DishWhereInput {
  if (args?.includeBots === false) {
    return {
      isHidden: false,
      botMeta: null,
    };
  }
  return { isHidden: false };
}
