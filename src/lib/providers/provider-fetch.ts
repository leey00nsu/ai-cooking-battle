import { ProviderError } from "@/lib/providers/provider-error";

type FetchJsonOptions = RequestInit & {
  timeoutMs?: number;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export async function fetchJsonWithTimeout<T>(
  provider: string,
  input: RequestInfo | URL,
  init?: FetchJsonOptions,
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const payload = await parseResponseBody(response);
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : typeof payload === "string"
            ? payload
            : `Request failed with ${response.status}.`;

      throw new ProviderError({
        provider,
        code: "HTTP_ERROR",
        status: response.status,
        message,
      });
    }

    return payload as T;
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      throw new ProviderError({
        provider,
        code: "TIMEOUT",
        message: `Request timed out after ${timeoutMs}ms.`,
        cause: error,
      });
    }
    if (error instanceof ProviderError) {
      throw error;
    }
    throw new ProviderError({
      provider,
      code: "UNKNOWN",
      message: "Request failed.",
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
