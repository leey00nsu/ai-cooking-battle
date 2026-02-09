import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const prisma = vi.hoisted(() => ({
  botPersona: {
    findMany: vi.fn(),
  },
  botSeedRun: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  dish: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  dishDayScore: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  dishBotMeta: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  botSeedItem: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  user: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const selectDailyPersonas = vi.hoisted(() => vi.fn());
const getOrCreateDayTheme = vi.hoisted(() => vi.fn());
const generateBotDishPromptWithOpenAi = vi.hoisted(() => vi.fn());
const runDishGeneration = vi.hoisted(() => vi.fn());
const formatDayKeyForKST = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/entities/bot-persona/model/select-daily-personas", () => ({ selectDailyPersonas }));
vi.mock("@/lib/day-theme/get-or-create-day-theme", () => ({ getOrCreateDayTheme }));
vi.mock("@/lib/providers/openai-bot-dish-prompt-generator", () => ({
  generateBotDishPromptWithOpenAi,
}));
vi.mock("@/workers/services/run-dish-generation", () => ({ runDishGeneration }));
vi.mock("@/shared/lib/day-key", () => ({ formatDayKeyForKST }));

import { processBotSeedJob } from "@/workers/bot-seed-handler";

describe("processBotSeedJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    formatDayKeyForKST.mockReturnValue("2026-02-08");
    getOrCreateDayTheme.mockResolvedValue({
      dayKey: "2026-02-08",
      themeText: "한식",
      themeTextEn: "Korean cuisine",
    });
    generateBotDishPromptWithOpenAi.mockResolvedValue({
      ok: true,
      dishPromptEn: "generated prompt from theme and persona with style one",
    });
    prisma.botPersona.findMany.mockResolvedValue([
      {
        personaKey: "p1",
        displayName: "P1",
        stylePrompt: "style one",
        styleGroup: "g1",
        isActive: true,
      },
      {
        personaKey: "p2",
        displayName: "P2",
        stylePrompt: "style two",
        styleGroup: "g2",
        isActive: true,
      },
    ]);
    prisma.botSeedRun.upsert.mockResolvedValue({ id: "run-1" });
    prisma.botSeedRun.update.mockResolvedValue({ id: "run-1" });
    prisma.botSeedItem.findMany.mockResolvedValue([]);
    prisma.botSeedItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.botSeedItem.create.mockResolvedValue({ id: "item" });
    prisma.user.upsert.mockResolvedValue({ id: "bot-system-user" });

    prisma.dish.create.mockResolvedValue({ id: "dish-1" });
    prisma.dish.updateMany.mockResolvedValue({ count: 0 });
    prisma.dishDayScore.create.mockResolvedValue({ id: "score-1" });
    prisma.dishDayScore.deleteMany.mockResolvedValue({ count: 0 });
    prisma.dishBotMeta.create.mockResolvedValue({ id: "meta-1" });
    prisma.dishBotMeta.deleteMany.mockResolvedValue({ count: 0 });
    prisma.botSeedItem.create.mockResolvedValue({ id: "seed-item-1" });
    prisma.$transaction.mockImplementation(
      async (runner: (txArg: typeof prisma) => Promise<unknown>) => runner(prisma),
    );
  });

  it("records success path and marks run SUCCEEDED", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [{ personaKey: "p1", styleGroup: "g1" }],
      fallback: [{ personaKey: "p2", styleGroup: "g2" }],
    });
    runDishGeneration.mockResolvedValue({
      status: "ALLOW",
      imageUrl: "https://cdn.example/a.webp",
      generationPrompt: "prompt",
    });

    const result = await processBotSeedJob({ dayKey: "2026-02-09", triggerType: "SCHEDULE" });

    expect(runDishGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "bot-system-user",
        promptEn: "generated prompt from theme and persona with style one",
      }),
    );
    expect(prisma.dish.create).toHaveBeenCalled();
    expect(prisma.dishBotMeta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dayKey: "2026-02-09",
          personaKey: "p1",
          seedRunId: "run-1",
        }),
      }),
    );
    expect(prisma.botSeedRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUCCEEDED",
          successCount: 1,
        }),
      }),
    );
    expect(result).toEqual({
      dayKey: "2026-02-09",
      selectedCount: 1,
      status: "SUCCEEDED",
    });
  });

  it("retries selected persona once and then uses fallback persona", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [{ personaKey: "p1", styleGroup: "g1" }],
      fallback: [{ personaKey: "p2", styleGroup: "g2" }],
    });
    runDishGeneration
      .mockResolvedValueOnce({
        status: "BLOCK",
        imageUrl: "https://cdn.example/block.webp",
        generationPrompt: "prompt",
        category: "POLICY",
        reason: "blocked",
      })
      .mockRejectedValueOnce(
        new ProviderError({ provider: "leesfield", code: "TIMEOUT", message: "timeout" }),
      )
      .mockResolvedValueOnce({
        status: "ALLOW",
        imageUrl: "https://cdn.example/ok.webp",
        generationPrompt: "prompt",
      });

    const result = await processBotSeedJob({ dayKey: "2026-02-09", triggerType: "ADMIN" });

    expect(prisma.botSeedItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          personaKey: "p1",
          selectedOrder: 1,
          attempt: 1,
          status: "FAILED",
          errorCode: "POLICY",
        }),
      }),
    );
    expect(prisma.botSeedItem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          personaKey: "p1",
          selectedOrder: 1,
          attempt: 2,
          status: "FAILED",
          errorCode: "leesfield:TIMEOUT",
        }),
      }),
    );
    expect(prisma.botSeedItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          personaKey: "p2",
          selectedOrder: 1,
          attempt: 3,
          status: "SUCCEEDED",
        }),
      }),
    );
    expect(result.status).toBe("SUCCEEDED");
  });

  it("falls back to theme+style prompt when openai prompt generation fails", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [{ personaKey: "p1", styleGroup: "g1" }],
      fallback: [],
    });
    generateBotDishPromptWithOpenAi.mockRejectedValueOnce(
      new ProviderError({ provider: "openai", code: "TIMEOUT", message: "timeout" }),
    );
    runDishGeneration.mockResolvedValueOnce({
      status: "ALLOW",
      imageUrl: "https://cdn.example/ok.webp",
      generationPrompt: "prompt",
    });

    await processBotSeedJob({ dayKey: "2026-02-09", triggerType: "ADMIN" });

    expect(runDishGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        promptEn: "Korean cuisine, style one",
      }),
    );
  });

  it("uses openai dish prompt as-is when response type is valid", async () => {
    selectDailyPersonas.mockReturnValue({
      selected: [{ personaKey: "p1", styleGroup: "g1" }],
      fallback: [],
    });
    generateBotDishPromptWithOpenAi.mockResolvedValueOnce({
      ok: true,
      dishPromptEn: "Charcoal-grilled dishes suitable for a winter campfire",
    });
    runDishGeneration.mockResolvedValueOnce({
      status: "ALLOW",
      imageUrl: "https://cdn.example/ok.webp",
      generationPrompt: "prompt",
    });

    await processBotSeedJob({ dayKey: "2026-02-09", triggerType: "ADMIN" });

    expect(runDishGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        promptEn: "Charcoal-grilled dishes suitable for a winter campfire",
      }),
    );
  });
});
