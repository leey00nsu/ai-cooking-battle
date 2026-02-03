import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const generateImageUrl = vi.fn();
const checkImageSafetyWithOpenAi = vi.fn();
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
  $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<void>) => await fn(prisma)),
};

vi.mock("@/lib/providers/leesfield-image-generator", () => ({
  generateImageUrl,
}));

vi.mock("@/lib/providers/openai-safety-checker", () => ({
  checkImageSafetyWithOpenAi,
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

    prisma.createRequest.findUnique
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        id: "req",
        userId: "user",
        prompt: "피자",
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
    checkImageSafetyWithOpenAi.mockResolvedValueOnce({ ok: true });
    prisma.dish.create.mockResolvedValueOnce({ id: "dish" });

    await processCreatePipelineRequest("req");

    expect(generateImageUrl).toHaveBeenCalledWith(
      { prompt: "피자" },
      { timeoutMs: 180000, pollIntervalMs: 1200 },
    );
    expect(checkImageSafetyWithOpenAi).toHaveBeenCalledWith({
      prompt: "피자",
      imageUrl: "https://cdn.example/image.webp",
    });

    expect(prisma.dish.create).toHaveBeenCalledWith({
      data: {
        userId: "user",
        prompt: "피자",
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

    checkImageSafetyWithOpenAi.mockResolvedValueOnce({
      ok: false,
      category: "POLICY",
      reason: "차단",
    });

    await processCreatePipelineRequest("req");

    expect(generateImageUrl).not.toHaveBeenCalled();
    expect(prisma.dish.create).not.toHaveBeenCalled();
    expect(markReservationFailed).toHaveBeenCalled();
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
    expect(markReservationFailed).not.toHaveBeenCalled();
  });
});
