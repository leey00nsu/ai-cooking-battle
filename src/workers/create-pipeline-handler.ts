import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatedDishSuffixEn } from "@/lib/prompts/prompt-templates";
import { generateImageUrl } from "@/lib/providers/leesfield-image-generator";
import { checkImageSafetyWithOpenAiWithRaw } from "@/lib/providers/openai-safety-checker";
import { ProviderError } from "@/lib/providers/provider-error";
import { markReservationFailed } from "@/lib/slot-recovery";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

function safeUrlHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function buildGenerationPrompt(userPrompt: string) {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return "";
  }
  return `${trimmed}\n\n${getPlatedDishSuffixEn()}`;
}

function isRetryableError(error: unknown) {
  if (error instanceof ProviderError) {
    if (error.code === "TIMEOUT") return true;
    if (error.code === "UNKNOWN") return true;
    if (error.code === "HTTP_ERROR") {
      const status = error.status ?? 0;
      return status >= 500 || status === 429;
    }
    return false;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("deadlock")) return true;
    if (message.includes("timeout")) return true;
  }

  return false;
}

export async function processCreatePipelineRequest(requestId: string) {
  const id = requestId.toString().trim();
  if (!id) {
    throw new Error("[create-pipeline] Missing requestId.");
  }

  const createRequest = await prisma.createRequest.findUnique({
    where: { id },
    include: { reservation: true },
  });

  if (!createRequest) {
    console.warn("[create-pipeline] request not found", { requestId: id });
    return;
  }

  console.log("[create-pipeline] start", {
    requestId: id,
    status: createRequest.status,
    hasImageUrl: Boolean(createRequest.imageUrl),
    hasDishId: Boolean(createRequest.dishId),
  });

  if (createRequest.status === "DONE" || createRequest.status === "FAILED") {
    return;
  }

  if (createRequest.dishId) {
    await prisma.createRequest.update({
      where: { id },
      data: { status: "DONE" },
    });
    return;
  }

  const prompt = createRequest.prompt?.trim() ?? "";
  if (!prompt) {
    await prisma.createRequest.update({
      where: { id },
      data: { status: "FAILED" },
    });
    await markReservationFailed(createRequest.reservation);
    return;
  }

  let latestImageUrlForLog: string | null = createRequest.imageUrl?.trim() || null;
  const generationPrompt = buildGenerationPrompt(prompt);

  try {
    const imageUrl =
      createRequest.imageUrl?.trim() ||
      (await (async () => {
        await prisma.createRequest.update({
          where: { id },
          data: { status: "GENERATING" },
        });

        console.log("[create-pipeline] leesfield start", { requestId: id });
        const generated = await generateImageUrl(
          { prompt: generationPrompt },
          { timeoutMs: 180_000, pollIntervalMs: 1200 },
        );
        console.log("[create-pipeline] leesfield done", {
          requestId: id,
          imageHost: safeUrlHost(generated.url),
        });

        await prisma.createRequest.update({
          where: { id },
          data: { imageUrl: generated.url },
        });

        return generated.url;
      })());

    latestImageUrlForLog = imageUrl;

    await prisma.createRequest.update({
      where: { id },
      data: { status: "SAFETY" },
    });

    console.log("[create-pipeline] safety start", { requestId: id });
    const safetyChecked = await checkImageSafetyWithOpenAiWithRaw({
      prompt: generationPrompt,
      imageUrl,
    });
    const safety = safetyChecked.result;
    console.log("[create-pipeline] safety done", { requestId: id, ok: safety.ok });

    try {
      await prisma.openAiCallLog.create({
        data: {
          kind: "IMAGE_SAFETY",
          model: safetyChecked.raw.model,
          openAiResponseId: safetyChecked.raw.openAiResponseId,
          userId: createRequest.userId,
          createRequestId: id,
          inputPrompt: generationPrompt || prompt,
          inputImageUrl: imageUrl,
          outputText: safetyChecked.raw.outputText,
          outputJson: safetyChecked.raw.outputJson as Prisma.InputJsonValue,
          decision: safety.ok ? "ALLOW" : "BLOCK",
          category: safety.ok ? "OK" : safety.category,
          reason: safety.ok ? null : safety.reason,
        },
      });
    } catch (logError) {
      console.warn("[create-pipeline] failed to persist openai safety log", {
        requestId: id,
        error: logError instanceof Error ? logError.message : String(logError),
      });
    }

    if (!safety.ok) {
      await prisma.createRequest.update({
        where: { id },
        data: { status: "FAILED" },
      });
      await markReservationFailed(createRequest.reservation);
      console.warn("[create-pipeline] safety check blocked", {
        requestId: id,
        category: safety.category,
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const latest = await tx.createRequest.findUnique({ where: { id } });
      if (!latest || latest.status === "DONE" || latest.status === "FAILED") {
        return;
      }
      if (latest.dishId) {
        await tx.createRequest.update({ where: { id }, data: { status: "DONE" } });
        return;
      }

      const dish = await tx.dish.create({
        data: {
          userId: createRequest.userId,
          prompt,
          imageUrl,
          isHidden: false,
        },
      });

      await tx.dishDayScore.create({
        data: {
          dishId: dish.id,
          dayKey: formatDayKeyForKST(),
          totalScore: 0,
        },
      });

      await tx.createRequest.update({
        where: { id },
        data: {
          status: "DONE",
          dishId: dish.id,
          imageUrl,
        },
      });
    });

    console.log("[create-pipeline] done", { requestId: id });
  } catch (error) {
    if (isRetryableError(error)) {
      console.warn("[create-pipeline] retryable error", {
        requestId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    console.error("[create-pipeline] non-retryable error", {
      requestId: id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ProviderError && error.provider === "openai") {
      try {
        await prisma.openAiCallLog.create({
          data: {
            kind: "IMAGE_SAFETY",
            model: process.env.OPENAI_SAFETY_CHECK_MODEL?.trim() || "gpt-5.2-mini",
            userId: createRequest.userId,
            createRequestId: id,
            inputPrompt: generationPrompt,
            inputImageUrl: latestImageUrlForLog,
            errorCode: error.code,
            errorStatus: error.status ?? null,
            errorMessage: error.message,
          },
        });
      } catch (logError) {
        console.warn("[create-pipeline] failed to persist openai safety error log", {
          requestId: id,
          error: logError instanceof Error ? logError.message : String(logError),
        });
      }
    }

    await prisma.createRequest.update({
      where: { id },
      data: { status: "FAILED" },
    });
    await markReservationFailed(createRequest.reservation);
  }
}
