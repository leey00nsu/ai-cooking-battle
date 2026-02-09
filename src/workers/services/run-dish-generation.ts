import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatedDishSuffixEn } from "@/lib/prompts/prompt-templates";
import { generateImageUrl } from "@/lib/providers/leesfield-image-generator";
import { checkImageSafetyWithOpenAiWithRaw } from "@/lib/providers/openai-safety-checker";
import { ProviderError } from "@/lib/providers/provider-error";

type RunDishGenerationInput = {
  userId: string;
  prompt: string;
  promptEn?: string | null;
  imageUrl?: string | null;
  createRequestId?: string | null;
  onImageReady?: (imageUrl: string) => Promise<void> | void;
};

type RunDishGenerationAllowed = {
  status: "ALLOW";
  imageUrl: string;
  generationPrompt: string;
};

type RunDishGenerationBlocked = {
  status: "BLOCK";
  imageUrl: string;
  generationPrompt: string;
  category?: string;
  reason?: string;
};

export type RunDishGenerationResult = RunDishGenerationAllowed | RunDishGenerationBlocked;

function buildGenerationPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed}, ${getPlatedDishSuffixEn()}`;
}

function normalizeBasePrompt(args: Pick<RunDishGenerationInput, "prompt" | "promptEn">) {
  return args.promptEn?.trim() || args.prompt.trim();
}

async function persistOpenAiSafetyLog(args: {
  userId: string;
  createRequestId?: string | null;
  generationPrompt: string;
  imageUrl: string;
  raw: {
    model: string;
    openAiResponseId: string | null;
    outputText: string;
    outputJson: unknown;
  };
  safety: {
    ok: boolean;
    category?: string;
    reason?: string;
  };
}) {
  try {
    await prisma.openAiCallLog.create({
      data: {
        kind: "IMAGE_SAFETY",
        model: args.raw.model,
        openAiResponseId: args.raw.openAiResponseId,
        userId: args.userId,
        createRequestId: args.createRequestId ?? null,
        inputPrompt: args.generationPrompt,
        inputImageUrl: args.imageUrl,
        outputText: args.raw.outputText,
        outputJson: args.raw.outputJson as Prisma.InputJsonValue,
        decision: args.safety.ok ? "ALLOW" : "BLOCK",
        category: args.safety.ok ? "OK" : args.safety.category,
        reason: args.safety.ok ? null : args.safety.reason,
      },
    });
  } catch (error) {
    console.warn("[run-dish-generation] failed to persist openai safety log", {
      createRequestId: args.createRequestId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function persistOpenAiSafetyError(args: {
  userId: string;
  createRequestId?: string | null;
  generationPrompt: string;
  imageUrl: string | null;
  error: ProviderError;
}) {
  try {
    await prisma.openAiCallLog.create({
      data: {
        kind: "IMAGE_SAFETY",
        model: process.env.OPENAI_SAFETY_CHECK_MODEL?.trim() || "gpt-5-mini",
        userId: args.userId,
        createRequestId: args.createRequestId ?? null,
        inputPrompt: args.generationPrompt,
        inputImageUrl: args.imageUrl,
        errorCode: args.error.code,
        errorStatus: args.error.status ?? null,
        errorMessage: args.error.message,
      },
    });
  } catch (logError) {
    console.warn("[run-dish-generation] failed to persist openai safety error log", {
      createRequestId: args.createRequestId ?? null,
      error: logError instanceof Error ? logError.message : String(logError),
    });
  }
}

export async function runDishGeneration(
  args: RunDishGenerationInput,
): Promise<RunDishGenerationResult> {
  const userId = args.userId.toString().trim();
  if (!userId) {
    throw new Error("[run-dish-generation] userId is required.");
  }

  const basePrompt = normalizeBasePrompt(args);
  if (!basePrompt) {
    throw new Error("[run-dish-generation] prompt is required.");
  }

  const generationPrompt = buildGenerationPrompt(basePrompt);
  if (!generationPrompt) {
    throw new Error("[run-dish-generation] generation prompt is empty.");
  }

  let imageUrl = args.imageUrl?.toString().trim() || null;

  if (!imageUrl) {
    const generated = await generateImageUrl(
      { prompt: generationPrompt },
      { timeoutMs: 180_000, pollIntervalMs: 1200 },
    );
    imageUrl = generated.url;
  }

  await args.onImageReady?.(imageUrl);

  try {
    const safetyChecked = await checkImageSafetyWithOpenAiWithRaw({
      prompt: generationPrompt,
      imageUrl,
    });
    const safety = safetyChecked.result;

    await persistOpenAiSafetyLog({
      userId,
      createRequestId: args.createRequestId ?? null,
      generationPrompt,
      imageUrl,
      raw: {
        model: safetyChecked.raw.model,
        openAiResponseId: safetyChecked.raw.openAiResponseId,
        outputText: safetyChecked.raw.outputText,
        outputJson: safetyChecked.raw.outputJson,
      },
      safety,
    });

    if (!safety.ok) {
      return {
        status: "BLOCK",
        imageUrl,
        generationPrompt,
        category: safety.category,
        reason: safety.reason,
      };
    }

    return {
      status: "ALLOW",
      imageUrl,
      generationPrompt,
    };
  } catch (error) {
    if (error instanceof ProviderError && error.provider === "openai") {
      await persistOpenAiSafetyError({
        userId,
        createRequestId: args.createRequestId ?? null,
        generationPrompt,
        imageUrl,
        error,
      });
    }
    throw error;
  }
}
