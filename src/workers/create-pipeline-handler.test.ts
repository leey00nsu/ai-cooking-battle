import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatedDishSuffixEn } from "@/lib/prompts/prompt-templates";
import { ProviderError } from "@/lib/providers/provider-error";

const generateImageUrl = vi.fn();
const checkImageSafetyWithOpenAiWithRaw = vi.fn();
const markReservationFailed = vi.fn();
const formatDayKeyForKST = vi.fn(() => "2026-02-03");

const prisma = {
  createRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  dish: {
    create: vi.fn(),
  },
  dishDayScore: {
    create: vi.fn(),
  },
  openAiCallLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<void>) => await fn(prisma)),
};

vi.mock("@/lib/providers/leesfield-image-generator", () => ({
  generateImageUrl,
}));

vi.mock("@/lib/providers/openai-safety-checker", () => ({
  checkImageSafetyWithOpenAiWithRaw,
}));

vi.mock("@/lib/slot-recovery", () => ({
  markReservationFailed,
}));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST,
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("processCreatePipelineRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates dish and marks request DONE (happy path)", async () => {
    const { processCreatePipelineRequest } = await import("./create-pipeline-handler");
    const generationPrompt = `pizza, ${getPlatedDishSuffixEn()}`;

    prisma.createRequest.findUnique
      .mockResolvedValueOnce({
        id: "req",
        userId: "user",
        prompt: "피자",
        promptEn: "pizza",
        reservationId: "res",
        status: "GENERATING",
        dishId: null,
        imageUrl: null,
        reservation: {
          id: "res",
          status: "CONFIRMED",
          dayKey: "2026-02-03",
          slotType: "FREE",
        },
      })
      .mockResolvedValueOnce({
        id: "req",
        userId: "user",
        prompt: "피자",
        promptEn: "pizza",
        reservationId: "res",
        status: "SAFETY",
        dishId: null,
        imageUrl: "https://cdn.example/image.webp",
      });

    generateImageUrl.mockResolvedValueOnce({
      requestId: "gen",
      url: "https://cdn.example/image.webp",
      width: 1024,
      height: 1024,
    });
    checkImageSafetyWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: true },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"ALLOW"}',
        outputJson: { decision: "ALLOW" },
      },
    });
    prisma.dish.create.mockResolvedValueOnce({ id: "dish" });

    await processCreatePipelineRequest("req");

    expect(generateImageUrl).toHaveBeenCalledWith(
      {
        prompt: generationPrompt,
      },
      { timeoutMs: 180000, pollIntervalMs: 1200 },
    );
    expect(checkImageSafetyWithOpenAiWithRaw).toHaveBeenCalledWith({
      prompt: generationPrompt,
      imageUrl: "https://cdn.example/image.webp",
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "IMAGE_SAFETY",
        model: "gpt-test",
        userId: "user",
        createRequestId: "req",
        inputPrompt: generationPrompt,
        inputImageUrl: "https://cdn.example/image.webp",
      }),
    });

    expect(prisma.dish.create).toHaveBeenCalledWith({
      data: {
        userId: "user",
        prompt: "피자",
        promptEn: "pizza",
        imageUrl: "https://cdn.example/image.webp",
        isHidden: false,
      },
    });
    expect(prisma.dishDayScore.create).toHaveBeenCalledWith({
      data: { dishId: "dish", dayKey: "2026-02-03", totalScore: 0 },
    });

    expect(prisma.createRequest.update).toHaveBeenCalledWith({
      where: { id: "req" },
      data: { status: "SAFETY" },
    });
    expect(prisma.createRequest.update).toHaveBeenCalledWith({
      where: { id: "req" },
      data: { status: "DONE", dishId: "dish", imageUrl: "https://cdn.example/image.webp" },
    });
    expect(markReservationFailed).not.toHaveBeenCalled();
  });

  it("marks request FAILED and refunds slot when safety blocks", async () => {
    const { processCreatePipelineRequest } = await import("./create-pipeline-handler");

    prisma.createRequest.findUnique.mockResolvedValueOnce({
      id: "req",
      userId: "user",
      prompt: "피자",
      reservationId: "res",
      status: "GENERATING",
      dishId: null,
      imageUrl: "https://cdn.example/image.webp",
      reservation: {
        id: "res",
        status: "CONFIRMED",
        dayKey: "2026-02-03",
        slotType: "FREE",
      },
    });

    checkImageSafetyWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: false, category: "POLICY", reason: "차단" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp",
        outputText: '{"decision":"BLOCK"}',
        outputJson: { decision: "BLOCK" },
      },
    });

    await processCreatePipelineRequest("req");

    expect(generateImageUrl).not.toHaveBeenCalled();
    expect(prisma.dish.create).not.toHaveBeenCalled();
    expect(markReservationFailed).toHaveBeenCalled();
    expect(prisma.openAiCallLog.create).toHaveBeenCalled();
    expect(prisma.createRequest.update).toHaveBeenCalledWith({
      where: { id: "req" },
      data: { status: "FAILED" },
    });
  });

  it("throws on retryable provider error (so job can retry)", async () => {
    const { processCreatePipelineRequest } = await import("./create-pipeline-handler");

    prisma.createRequest.findUnique.mockResolvedValueOnce({
      id: "req",
      userId: "user",
      prompt: "피자",
      reservationId: "res",
      status: "GENERATING",
      dishId: null,
      imageUrl: null,
      reservation: {
        id: "res",
        status: "CONFIRMED",
        dayKey: "2026-02-03",
        slotType: "FREE",
      },
    });

    generateImageUrl.mockRejectedValueOnce(
      new ProviderError({ provider: "leesfield", code: "TIMEOUT", message: "timeout" }),
    );

    await expect(processCreatePipelineRequest("req")).rejects.toBeInstanceOf(ProviderError);
    expect(prisma.createRequest.update).not.toHaveBeenCalledWith({
      where: { id: "req" },
      data: { status: "FAILED" },
    });
    expect(prisma.openAiCallLog.create).not.toHaveBeenCalled();
    expect(markReservationFailed).not.toHaveBeenCalled();
  });
});
