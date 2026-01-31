export type FetchJsonError = Error & {
  status?: number;
  code?: string;
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

const resolveMessage = (payload: unknown) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  return null;
};

const resolveCode = (payload: unknown) => {
  if (typeof payload === "object" && payload && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
};

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const error = new Error(
      resolveMessage(payload) ?? `Request failed with ${response.status}.`,
    ) as FetchJsonError;
    error.status = response.status;
    error.code = resolveCode(payload);
    throw error;
  }

  return payload as T;
}
