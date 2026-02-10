import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const markReservationFailed = vi.fn();
const runDishGeneration = vi.fn();

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

vi.mock("@/workers/services/run-dish-generation", () => ({
  runDishGeneration,
}));

vi.mock("@/lib/slot-recovery", () => ({
  markReservationFailed,
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
        status: "SAFETY",
        dishId: null,
      });

    runDishGeneration.mockImplementation(
      async ({ onImageReady }: { onImageReady: (url: string) => Promise<void> }) => {
        await onImageReady("https://cdn.example/image.webp");
        return {
          status: "ALLOW",
          imageUrl: "https://cdn.example/image.webp",
          generationPrompt: "pizza plated",
        };
      },
    );
    prisma.dish.create.mockResolvedValueOnce({ id: "dish" });

    await processCreatePipelineRequest("req");

    expect(runDishGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user",
        prompt: "피자",
        promptEn: "pizza",
        createRequestId: "req",
      }),
    );
    expect(prisma.createRequest.update).toHaveBeenCalledWith({
      where: { id: "req" },
      data: { status: "GENERATING" },
    });
    expect(prisma.createRequest.update).toHaveBeenCalledWith({
      where: { id: "req" },
      data: { imageUrl: "https://cdn.example/image.webp", status: "SAFETY" },
    });
    expect(prisma.dish.create).toHaveBeenCalledWith({
      data: {
        userId: "user",
        dishName: "피자",
        dishNameEn: "pizza",
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
      data: { status: "DONE", dishId: "dish", imageUrl: "https://cdn.example/image.webp" },
    });
    expect(markReservationFailed).not.toHaveBeenCalled();
  });

  it("falls back dishName to promptEn when prompt is blank", async () => {
    const { processCreatePipelineRequest } = await import("./create-pipeline-handler");

    prisma.createRequest.findUnique
      .mockResolvedValueOnce({
        id: "req",
        userId: "user",
        prompt: "   ",
        promptEn: "charcoal grilled bowl",
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
        status: "SAFETY",
        dishId: null,
      });

    runDishGeneration.mockImplementation(
      async ({ onImageReady }: { onImageReady: (url: string) => Promise<void> }) => {
        await onImageReady("https://cdn.example/image.webp");
        return {
          status: "ALLOW",
          imageUrl: "https://cdn.example/image.webp",
          generationPrompt: "charcoal grilled bowl, close-up",
        };
      },
    );
    prisma.dish.create.mockResolvedValueOnce({ id: "dish" });

    await processCreatePipelineRequest("req");

    expect(prisma.dish.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dishName: "charcoal grilled bowl",
        dishNameEn: "charcoal grilled bowl",
        prompt: "",
        promptEn: "charcoal grilled bowl",
      }),
    });
  });

  it("marks request FAILED when safety blocks", async () => {
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

    runDishGeneration.mockImplementation(
      async ({ onImageReady }: { onImageReady: (url: string) => Promise<void> }) => {
        await onImageReady("https://cdn.example/image.webp");
        return {
          status: "BLOCK",
          imageUrl: "https://cdn.example/image.webp",
          generationPrompt: "pizza plated",
          category: "POLICY",
          reason: "차단",
        };
      },
    );

    await processCreatePipelineRequest("req");

    expect(prisma.dish.create).not.toHaveBeenCalled();
    expect(markReservationFailed).not.toHaveBeenCalled();
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

    runDishGeneration.mockRejectedValueOnce(
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
