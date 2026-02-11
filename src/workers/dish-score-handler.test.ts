import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";

const generateDishScoreWithOpenAiWithRaw = vi.fn();
const resolveOpenAiDishScoreModel = vi.fn(() => "gpt-5-mini");
const trackServerEvent = vi.fn();

const prisma = {
  dishDayScore: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  dish: {
    findUnique: vi.fn(),
  },
  dayTheme: {
    findUnique: vi.fn(),
  },
  openAiCallLog: {
    create: vi.fn(),
  },
};

const baseTheme = {
  themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
  themeTextEn: "Charcoal-grilled dishes suitable for a winter campfire",
  axisAType: "장소",
  axisA: "한겨울 캠핑 화롯가",
  axisBType: "조리법",
  axisB: "숯불구이",
  axisFlavor: "훈연향",
  themeWeights: { A: 15, B: 55, F: 30 },
  themeSignals: {
    A: ["야외 분위기의 자연광"],
    B: ["숯불구이 형태의 메인 구성"],
    F: ["훈연된 갈색 그릴 마크"],
  },
};

vi.mock("@/lib/providers/openai-dish-score-generator", () => ({
  generateDishScoreWithOpenAiWithRaw,
  resolveOpenAiDishScoreModel,
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/shared/analytics/track-server-event", () => ({ trackServerEvent }));

describe("processDishScoreJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when score is already READY", async () => {
    const { processDishScoreJob } = await import("./dish-score-handler");

    prisma.dishDayScore.findUnique.mockResolvedValueOnce({ status: "READY" });

    const result = await processDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" });

    expect(result).toEqual({
      status: "SKIPPED_READY",
      dishId: "dish-1",
      dayKey: "2026-02-10",
    });
    expect(generateDishScoreWithOpenAiWithRaw).not.toHaveBeenCalled();
  });

  it("stores READY score when analysis succeeds", async () => {
    const { processDishScoreJob } = await import("./dish-score-handler");

    prisma.dishDayScore.findUnique.mockResolvedValueOnce(null);
    prisma.dish.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      prompt: "겨울 캠핑 숯불 해산물 구이",
      promptEn: "winter camp charcoal seafood",
      imageUrl: "https://cdn.example/dish.webp",
      botMeta: null,
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      ...baseTheme,
    });
    generateDishScoreWithOpenAiWithRaw.mockResolvedValueOnce({
      result: {
        ok: true,
        total: 87,
        themeFit: 90,
        execution: 84,
        oneLiner: "주제 맥락과 비주얼 완성도가 균형적입니다.",
        reasons: ["주제 재현이 명확합니다.", "플레이팅 대비가 선명합니다."],
        tip: "재료 질감 대비를 더 분명히 해보세요.",
      },
      raw: {
        model: "gpt-5-mini",
        openAiResponseId: "resp_1",
        outputText: "{}",
        outputJson: {},
      },
    });

    const result = await processDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" });

    expect(result).toEqual({
      status: "READY",
      dishId: "dish-1",
      dayKey: "2026-02-10",
      totalScore: 87,
    });
    expect(prisma.dishDayScore.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.dishDayScore.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "READY",
          totalScore: 87,
          themeFit: 90,
          execution: 84,
          oneLiner: "주제 맥락과 비주얼 완성도가 균형적입니다.",
          reasons: ["주제 재현이 명확합니다.", "플레이팅 대비가 선명합니다."],
          tip: "재료 질감 대비를 더 분명히 해보세요.",
          errorCode: null,
        }),
      }),
    );
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DISH_SCORE",
          decision: "READY",
          category: "OK",
          userId: "user-1",
        }),
      }),
    );
    expect(trackServerEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.SCORE_READY, {
      dishId: "dish-1",
      dayKey: "2026-02-10",
      totalScore: 87,
      themeFit: 90,
      execution: 84,
      userType: "user",
    });
    expect(generateDishScoreWithOpenAiWithRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        axisAType: "장소",
        axisA: "한겨울 캠핑 화롯가",
        axisBType: "조리법",
        axisB: "숯불구이",
        axisFlavor: "훈연향",
        themeWeights: { A: 15, B: 55, F: 30 },
        themeSignals: {
          A: ["야외 분위기의 자연광"],
          B: ["숯불구이 형태의 메인 구성"],
          F: ["훈연된 갈색 그릴 마크"],
        },
      }),
    );
  });

  it("throws on retryable error and keeps score PENDING", async () => {
    const { processDishScoreJob } = await import("./dish-score-handler");

    prisma.dishDayScore.findUnique.mockResolvedValueOnce(null);
    prisma.dish.findUnique.mockResolvedValueOnce({
      userId: "bot-system-user",
      prompt: "dish prompt",
      promptEn: "dish prompt",
      imageUrl: "https://cdn.example/dish.webp",
      botMeta: { id: "meta-1" },
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      ...baseTheme,
    });
    generateDishScoreWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({ provider: "openai", code: "TIMEOUT", message: "timeout" }),
    );

    await expect(processDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" })).rejects.toThrow(
      "timeout",
    );
    expect(prisma.dishDayScore.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "PENDING",
          errorCode: "openai:TIMEOUT",
        }),
      }),
    );
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DISH_SCORE",
          errorCode: "openai:TIMEOUT",
          userId: "bot-system-user",
        }),
      }),
    );
    expect(trackServerEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.SCORE_FAILED, {
      dishId: "dish-1",
      dayKey: "2026-02-10",
      errorCode: "openai:TIMEOUT",
      userType: "bot",
      retryable: true,
    });
  });

  it("marks FAILED on non-retryable error", async () => {
    const { processDishScoreJob } = await import("./dish-score-handler");

    prisma.dishDayScore.findUnique.mockResolvedValueOnce(null);
    prisma.dish.findUnique.mockResolvedValueOnce({
      userId: "bot-system-user",
      prompt: "dish prompt",
      promptEn: null,
      imageUrl: "https://cdn.example/dish.webp",
      botMeta: { id: "meta-1" },
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      ...baseTheme,
    });
    generateDishScoreWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({
        provider: "openai",
        code: "INVALID_RESPONSE",
        message: "invalid schema",
      }),
    );

    const result = await processDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" });

    expect(result).toEqual({
      status: "FAILED",
      dishId: "dish-1",
      dayKey: "2026-02-10",
      errorCode: "openai:INVALID_RESPONSE",
    });
    expect(prisma.dishDayScore.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "FAILED",
          errorCode: "openai:INVALID_RESPONSE",
        }),
      }),
    );
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DISH_SCORE",
          errorCode: "openai:INVALID_RESPONSE",
          userId: "bot-system-user",
        }),
      }),
    );
    expect(trackServerEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.SCORE_FAILED, {
      dishId: "dish-1",
      dayKey: "2026-02-10",
      errorCode: "openai:INVALID_RESPONSE",
      userType: "bot",
      retryable: false,
    });
  });

  it("marks FAILED when theme is missing", async () => {
    const { processDishScoreJob } = await import("./dish-score-handler");

    prisma.dishDayScore.findUnique.mockResolvedValueOnce(null);
    prisma.dish.findUnique.mockResolvedValueOnce({
      userId: "user-1",
      prompt: "dish prompt",
      promptEn: "dish prompt",
      imageUrl: "https://cdn.example/dish.webp",
      botMeta: null,
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce(null);

    const result = await processDishScoreJob({ dishId: "dish-1", dayKey: "2026-02-10" });

    expect(result).toEqual({
      status: "FAILED",
      dishId: "dish-1",
      dayKey: "2026-02-10",
      errorCode: "THEME_NOT_FOUND",
    });
    expect(prisma.dishDayScore.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "FAILED",
          errorCode: "THEME_NOT_FOUND",
        }),
      }),
    );
    expect(prisma.openAiCallLog.create).not.toHaveBeenCalled();
    expect(trackServerEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.SCORE_FAILED, {
      dishId: "dish-1",
      dayKey: "2026-02-10",
      errorCode: "THEME_NOT_FOUND",
      userType: "unknown",
      retryable: false,
    });
  });
});
