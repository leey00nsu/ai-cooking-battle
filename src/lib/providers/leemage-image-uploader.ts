import { ProviderError } from "@/lib/providers/provider-error";
import { fetchJsonWithTimeout } from "@/lib/providers/provider-fetch";

const PROVIDER = "leemage";

type LeemageConfig = {
  baseUrl: string;
  apiKey: string;
  projectId: string | null;
};

function getLeemageConfig(): LeemageConfig {
  const baseUrl = process.env.LEEMAGE_BASE_URL?.trim() || "https://leemage.leey00nsu.com";
  const apiKey = process.env.LEEMAGE_API_KEY?.trim() ?? "";
  const projectId = process.env.LEEMAGE_PROJECT_ID?.trim() || null;

  if (!apiKey) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "MISSING_ENV",
      message: "[leemage] Missing LEEMAGE_API_KEY.",
    });
  }

  return { baseUrl, apiKey, projectId };
}

export type LeemageVariant = {
  sizeLabel: string;
  format: "webp" | "avif" | "png" | "jpeg";
  width?: number;
  height?: number;
  label?: string;
};

type PresignResponse = {
  fileId: string;
  presignedUrl: string;
  objectName: string;
  objectUrl?: string;
  expiresAt?: string;
};

type ConfirmResponse = {
  id: string;
  url: string;
  variants?: Array<{ label?: string; url?: string; format?: string; sizeLabel?: string }>;
};

export type LeemageUploadInput = {
  data: Uint8Array | ArrayBuffer;
  fileName: string;
  contentType: string;
  projectId?: string;
  variants?: LeemageVariant[];
};

export type LeemageUploadResult = {
  fileId: string;
  url: string;
};

async function putPresigned(presignedUrl: string, bytes: Uint8Array, contentType: string) {
  const controller = new AbortController();
  const timeoutMs = 60_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const safeBytes = new Uint8Array(bytes);
    const body = new Blob([safeBytes], { type: contentType });

    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ProviderError({
        provider: PROVIDER,
        code: "HTTP_ERROR",
        status: response.status,
        message: `[leemage] Presigned upload failed: ${response.status}`,
      });
    }
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      throw new ProviderError({
        provider: PROVIDER,
        code: "TIMEOUT",
        message: `[leemage] Presigned upload timed out after ${timeoutMs}ms.`,
        cause: error,
      });
    }
    if (error instanceof ProviderError) {
      throw error;
    }
    throw new ProviderError({
      provider: PROVIDER,
      code: "UNKNOWN",
      message: "[leemage] Presigned upload failed.",
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadImageToLeemage(
  input: LeemageUploadInput,
): Promise<LeemageUploadResult> {
  const config = getLeemageConfig();
  const projectId = input.projectId?.trim() || config.projectId;
  if (!projectId) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "MISSING_ENV",
      message: "[leemage] Missing projectId (set LEEMAGE_PROJECT_ID or pass projectId).",
    });
  }

  const bytes = input.data instanceof ArrayBuffer ? new Uint8Array(input.data) : input.data;
  const fileName = input.fileName.trim();
  const contentType = input.contentType.trim();

  if (!fileName || !contentType || bytes.length === 0) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[leemage] fileName, contentType, and non-empty data are required.",
    });
  }

  const presign = await fetchJsonWithTimeout<PresignResponse>(
    PROVIDER,
    `${config.baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/files/presign`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName,
        contentType,
        fileSize: bytes.length,
      }),
      timeoutMs: 15_000,
    },
  );

  if (!presign?.fileId || !presign?.presignedUrl || !presign?.objectName) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[leemage] Invalid presign response.",
    });
  }

  await putPresigned(presign.presignedUrl, bytes, contentType);

  const confirmed = await fetchJsonWithTimeout<ConfirmResponse>(
    PROVIDER,
    `${config.baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}/files/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId: presign.fileId,
        objectName: presign.objectName,
        fileName,
        contentType,
        fileSize: bytes.length,
        ...(input.variants?.length ? { variants: input.variants } : {}),
      }),
      timeoutMs: 30_000,
    },
  );

  const variantUrl =
    confirmed.variants?.find((variant) => variant.sizeLabel === "max800")?.url ??
    confirmed.variants?.[0]?.url ??
    null;

  const url = (variantUrl ?? confirmed.url ?? "").toString().trim();
  if (!confirmed.id || !url) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[leemage] Invalid confirm response.",
    });
  }

  return { fileId: confirmed.id, url };
}
