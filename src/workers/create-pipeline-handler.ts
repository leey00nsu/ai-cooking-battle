import { prisma } from "@/lib/prisma";
import { ProviderError } from "@/lib/providers/provider-error";
import { markReservationFailed } from "@/lib/slot-recovery";
import { runDishGeneration } from "@/workers/services/run-dish-generation";

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
  const promptEn = createRequest.promptEn?.trim() || null;
  const basePrompt = promptEn || prompt;
  if (!basePrompt) {
    await prisma.createRequest.update({
      where: { id },
      data: { status: "FAILED" },
    });
    await markReservationFailed(createRequest.reservation);
    return;
  }

  try {
    if (!createRequest.imageUrl?.trim()) {
      await prisma.createRequest.update({
        where: { id },
        data: { status: "GENERATING" },
      });
    }

    const result = await runDishGeneration({
      userId: createRequest.userId,
      prompt,
      promptEn,
      imageUrl: createRequest.imageUrl,
      createRequestId: id,
      onImageReady: async (imageUrl) => {
        await prisma.createRequest.update({
          where: { id },
          data: { imageUrl, status: "SAFETY" },
        });
      },
    });

    if (result.status === "BLOCK") {
      await prisma.createRequest.update({
        where: { id },
        data: { status: "FAILED" },
      });
      console.warn("[create-pipeline] safety check blocked", {
        requestId: id,
        category: result.category,
      });
      return;
    }

    const imageUrl = result.imageUrl;

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
          dishName: prompt,
          dishNameEn: promptEn,
          prompt,
          promptEn,
          imageUrl,
          isHidden: false,
        },
      });

      await tx.dishDayScore.create({
        data: {
          dishId: dish.id,
          dayKey: createRequest.reservation.dayKey,
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

    await prisma.createRequest.update({
      where: { id },
      data: { status: "FAILED" },
    });
    await markReservationFailed(createRequest.reservation);
  }
}
