import { ProviderError } from "@/lib/providers/provider-error";
import { fetchJsonWithTimeout } from "@/lib/providers/provider-fetch";

const PROVIDER = "leesfield";

type LeesfieldConfig = {
  baseUrl: string;
  apiKey: string;
  imageModel: string;
};

function getLeesfieldConfig(): LeesfieldConfig {
  const baseUrl = process.env.LEESFIELD_BASE_URL?.trim() || "https://leesfield.leey00nsu.com";
  const apiKey = process.env.LEESFIELD_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "MISSING_ENV",
      message: "[leesfield] Missing LEESFIELD_API_KEY.",
    });
  }

  const imageModel = process.env.LEESFIELD_IMAGE_MODEL?.trim() ?? "";
  if (!imageModel) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "MISSING_ENV",
      message:
        "[leesfield] Missing LEESFIELD_IMAGE_MODEL. Use /api/external/models to get available keys.",
    });
  }

  return { baseUrl, apiKey, imageModel };
}

export type LeesfieldImageGenerationInput = {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  imageCount?: number;
  initImages?: Array<{
    bytes: Uint8Array;
    fileName: string;
    contentType?: string;
  }>;
  modeChoice?: string;
  guidanceScale?: number;
  promptUpsampling?: boolean;
  seed?: string | number;
};

type CreateImageGenerationResponse = {
  requestId: string;
  status: string;
  progress?: number;
};

type GetImageGenerationResponse = {
  requestId: string;
  status: string;
  progress?: number;
  result?: {
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
    }>;
  };
  errorMessage?: string | null;
};

async function createImageGenerationRequest(input: LeesfieldImageGenerationInput) {
  const { baseUrl, apiKey, imageModel } = getLeesfieldConfig();
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[leesfield] prompt is required.",
    });
  }

  const width = input.width ?? 1024;
  const height = input.height ?? 1024;
  const steps = input.steps ?? 9;
  const imageCount = input.imageCount ?? 1;
  const model = input.model?.trim() || imageModel;

  const form = new FormData();
  form.set("prompt", prompt);
  form.set("width", String(width));
  form.set("height", String(height));
  form.set("model", model);
  form.set("imageCount", String(imageCount));
  form.set("steps", String(steps));

  if (input.modeChoice?.trim()) {
    form.set("modeChoice", input.modeChoice.trim());
  }
  if (typeof input.guidanceScale === "number" && Number.isFinite(input.guidanceScale)) {
    form.set("guidanceScale", String(input.guidanceScale));
  }
  if (typeof input.promptUpsampling === "boolean") {
    form.set("promptUpsampling", input.promptUpsampling ? "true" : "false");
  }
  if (typeof input.seed === "string" || typeof input.seed === "number") {
    form.set("seed", String(input.seed));
  }
  if (input.initImages?.length) {
    for (const initImage of input.initImages) {
      const fileName = initImage.fileName?.trim() || "init.png";
      const contentType = initImage.contentType?.trim() || "application/octet-stream";
      const safeBytes = new Uint8Array(initImage.bytes);
      const blob = new Blob([safeBytes], { type: contentType });
      form.append("initImages", blob, fileName);
    }
  }

  return fetchJsonWithTimeout<CreateImageGenerationResponse>(
    PROVIDER,
    `${baseUrl}/api/external/image-generation`,
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
      body: form,
      timeoutMs: 30_000,
    },
  );
}

async function fetchImageGenerationStatus(requestId: string) {
  const { baseUrl, apiKey } = getLeesfieldConfig();
  return fetchJsonWithTimeout<GetImageGenerationResponse>(
    PROVIDER,
    `${baseUrl}/api/external/image-generation/${encodeURIComponent(requestId)}`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
      timeoutMs: 15_000,
    },
  );
}

async function downloadBytes(url: string, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ProviderError({
        provider: PROVIDER,
        code: "HTTP_ERROR",
        status: response.status,
        message: `[leesfield] Failed to download image: ${response.status}`,
      });
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();
    return { bytes: new Uint8Array(buffer), contentType };
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      throw new ProviderError({
        provider: PROVIDER,
        code: "TIMEOUT",
        message: `[leesfield] Image download timed out after ${timeoutMs}ms.`,
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type LeesfieldGeneratedImage = {
  requestId: string;
  bytes: Uint8Array;
  contentType: string;
  sourceUrl: string;
};

export async function generateImageBytes(
  input: LeesfieldImageGenerationInput,
  options?: { timeoutMs?: number; pollIntervalMs?: number },
): Promise<LeesfieldGeneratedImage> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 1200;

  const created = await createImageGenerationRequest(input);
  const requestId = created.requestId?.toString().trim();
  if (!requestId) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[leesfield] Missing requestId.",
    });
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await fetchImageGenerationStatus(requestId);
    const url = status.result?.images?.[0]?.url?.trim() ?? "";

    if (url) {
      const downloaded = await downloadBytes(url);
      return {
        requestId,
        bytes: downloaded.bytes,
        contentType: downloaded.contentType,
        sourceUrl: url,
      };
    }

    const state = (status.status ?? "").toUpperCase();
    if (state === "FAILED" || state === "ERROR") {
      throw new ProviderError({
        provider: PROVIDER,
        code: "HTTP_ERROR",
        message: `[leesfield] Generation failed. requestId=${requestId} (${status.errorMessage ?? "unknown"})`,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new ProviderError({
    provider: PROVIDER,
    code: "TIMEOUT",
    message: `[leesfield] Timed out waiting for result. requestId=${requestId}`,
  });
}
