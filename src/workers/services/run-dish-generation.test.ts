import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const generateImageUrl = vi.hoisted(() => vi.fn());
const checkImageSafetyWithOpenAiWithRaw = vi.hoisted(() => vi.fn());

const prisma = vi.hoisted(() => ({
  openAiCallLog: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/providers/leesfield-image-generator", () => ({
  generateImageUrl,
}));
vi.mock("@/lib/providers/openai-safety-checker", () => ({
  checkImageSafetyWithOpenAiWithRaw,
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { runDishGeneration } from "@/workers/services/run-dish-generation";

describe("runDishGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateImageUrl.mockResolvedValue({
      requestId: "gen-1",
      url: "https://cdn.example/image.webp",
      width: 1024,
      height: 1024,
    });
  });

  it("returns ALLOW and logs safety call", async () => {
    checkImageSafetyWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: true },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp-1",
        outputText: "{}",
        outputJson: { decision: "ALLOW" },
      },
    });

    const onImageReady = vi.fn();
    const result = await runDishGeneration({
      userId: "user-1",
      prompt: "한식",
      promptEn: "korean food",
      createRequestId: "req-1",
      onImageReady,
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "ALLOW",
        imageUrl: "https://cdn.example/image.webp",
      }),
    );
    expect(generateImageUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(
          "close-up, natural lighting, sharp focus, simple background.",
        ),
      }),
      expect.any(Object),
    );
    expect(onImageReady).toHaveBeenCalledWith("https://cdn.example/image.webp");
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          createRequestId: "req-1",
          decision: "ALLOW",
        }),
      }),
    );
  });

  it("returns BLOCK when safety check denies image", async () => {
    checkImageSafetyWithOpenAiWithRaw.mockResolvedValueOnce({
      result: { ok: false, category: "POLICY", reason: "blocked" },
      raw: {
        model: "gpt-test",
        openAiResponseId: "resp-2",
        outputText: "{}",
        outputJson: { decision: "BLOCK" },
      },
    });

    const result = await runDishGeneration({
      userId: "user-1",
      prompt: "한식",
      promptEn: "korean food",
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: "BLOCK",
        category: "POLICY",
        reason: "blocked",
      }),
    );
  });

  it("logs openai safety error then rethrows", async () => {
    checkImageSafetyWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({ provider: "openai", code: "TIMEOUT", message: "timeout" }),
    );

    await expect(
      runDishGeneration({
        userId: "user-1",
        prompt: "한식",
        promptEn: "korean food",
      }),
    ).rejects.toBeInstanceOf(ProviderError);

    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "IMAGE_SAFETY",
          userId: "user-1",
          errorCode: "TIMEOUT",
        }),
      }),
    );
  });
});
