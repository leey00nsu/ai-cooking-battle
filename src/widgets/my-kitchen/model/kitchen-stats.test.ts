import { describe, expect, it } from "vitest";
import type { MatchSummary } from "@/entities/match/model/types";
import { computeKitchenStats } from "./kitchen-stats";

function match(args: Partial<MatchSummary> = {}): MatchSummary {
  return {
    id: args.id ?? "match-1",
    dayKey: args.dayKey ?? "2026-03-04",
    leftDishImageUrl: args.leftDishImageUrl ?? "https://example.com/left.jpg",
    rightDishImageUrl: args.rightDishImageUrl ?? "https://example.com/right.jpg",
    leftScore: args.leftScore ?? 9.0,
    rightScore: args.rightScore ?? 8.0,
    isPractice: args.isPractice ?? false,
  };
}

describe("computeKitchenStats", () => {
  it("returns null stats when no recent items", () => {
    expect(computeKitchenStats(3, [])).toEqual({
      dishes: 3,
      winRate: null,
      streak: null,
    });
  });

  it("computes win rate and streak from decisive rows", () => {
    const result = computeKitchenStats(5, [
      match({ id: "m1", leftScore: 9.2, rightScore: 8.5 }),
      match({ id: "m2", leftScore: 8.9, rightScore: 8.3 }),
      match({ id: "m3", leftScore: 8.0, rightScore: 8.4 }),
    ]);

    expect(result).toEqual({
      dishes: 5,
      winRate: 67,
      streak: 2,
    });
  });

  it("returns null win metrics when all rows are ties", () => {
    const result = computeKitchenStats(2, [
      match({ id: "m1", leftScore: 8.8, rightScore: 8.8 }),
      match({ id: "m2", leftScore: 9.1, rightScore: 9.1 }),
    ]);

    expect(result).toEqual({
      dishes: 2,
      winRate: null,
      streak: null,
    });
  });
});
