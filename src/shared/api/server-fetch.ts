import { headers } from "next/headers";

export type FetchResult<T> = {
  data: T | null;
  error: boolean;
  status: number | null;
};

type GetJsonOptions = {
  includeErrorBody?: boolean;
  networkErrorStatus?: number | null;
};

export async function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

export async function getJson<T>(
  path: string,
  options: GetJsonOptions = {},
): Promise<FetchResult<T>> {
  const { includeErrorBody = false, networkErrorStatus = null } = options;
  const baseUrl = await getBaseUrl();
  const headerList = await headers();
  const cookie = headerList.get("cookie");

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });

    if (!response.ok) {
      const status = response.status;
      if (includeErrorBody) {
        try {
          return { data: (await response.json()) as T, error: true, status };
        } catch {
          return { data: null, error: true, status };
        }
      }
      return { data: null, error: true, status };
    }

    return { data: (await response.json()) as T, error: false, status: response.status };
  } catch {
    return { data: null, error: true, status: networkErrorStatus };
  }
}
