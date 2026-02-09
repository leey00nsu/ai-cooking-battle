import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  botSeedItem: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { listEligibleBotDishes } from "@/entities/bot-persona/api/list-eligible-bot-dishes";

describe("listEligibleBotDishes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.botSeedItem.findMany.mockResolvedValue([]);
  });

  it("returns empty list when dayKey is empty", async () => {
    await expect(listEligibleBotDishes("")).resolves.toEqual([]);
    await expect(listEligibleBotDishes("  ")).resolves.toEqual([]);
    expect(prisma.botSeedItem.findMany).not.toHaveBeenCalled();
  });

  it("returns only successful bot dishes for finalized run", async () => {
    prisma.botSeedItem.findMany.mockResolvedValueOnce([
      {
        dishId: "dish-1",
        selectedOrder: 1,
        personaKey: "triple-silhouette",
        seedRunId: "run-1",
        persona: { displayName: "트리플 실루엣" },
        dish: {
          imageUrl: "https://cdn.example/dish-1.webp",
          prompt: "네온 스트리트 푸드 (트리플 실루엣)",
          promptEn: "Neon Street Food, extreme precision plating",
          dayScores: [{ totalScore: 9.2 }],
        },
      },
      {
        dishId: "dish-2",
        selectedOrder: 2,
        personaKey: "kitchen-madness",
        seedRunId: "run-1",
        persona: { displayName: "키친 매드니스" },
        dish: {
          imageUrl: "https://cdn.example/dish-2.webp",
          prompt: "네온 스트리트 푸드 (키친 매드니스)",
          promptEn: "Neon Street Food, flames and smoke",
          dayScores: [],
        },
      },
      {
        dishId: null,
        selectedOrder: 3,
        personaKey: "invalid",
        seedRunId: "run-1",
        persona: { displayName: "invalid" },
        dish: null,
      },
    ]);

    await expect(listEligibleBotDishes("2026-02-08")).resolves.toEqual([
      {
        dishId: "dish-1",
        imageUrl: "https://cdn.example/dish-1.webp",
        prompt: "네온 스트리트 푸드 (트리플 실루엣)",
        promptEn: "Neon Street Food, extreme precision plating",
        personaKey: "triple-silhouette",
        personaDisplayName: "트리플 실루엣",
        selectedOrder: 1,
        dayScore: 9.2,
        seedRunId: "run-1",
      },
      {
        dishId: "dish-2",
        imageUrl: "https://cdn.example/dish-2.webp",
        prompt: "네온 스트리트 푸드 (키친 매드니스)",
        promptEn: "Neon Street Food, flames and smoke",
        personaKey: "kitchen-madness",
        personaDisplayName: "키친 매드니스",
        selectedOrder: 2,
        dayScore: null,
        seedRunId: "run-1",
      },
    ]);

    expect(prisma.botSeedItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SUCCEEDED",
          seedRun: {
            dayKey: "2026-02-08",
            status: { in: ["SUCCEEDED", "FAILED_PARTIAL"] },
          },
        }),
      }),
    );
  });
});
