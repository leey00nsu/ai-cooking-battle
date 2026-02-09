import { headers } from "next/headers";
import type { DishFeedResponse } from "@/entities/feed/model/types";
import FeedScreen from "@/screens/feed/ui/feed-screen";

type FetchResult<T> = {
  data: T | null;
  error: boolean;
};

async function getBaseUrl() {
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

async function getJson<T>(path: string): Promise<FetchResult<T>> {
  const baseUrl = await getBaseUrl();
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    if (!response.ok) {
      return { data: null, error: true };
    }
    return { data: (await response.json()) as T, error: false };
  } catch {
    return { data: null, error: true };
  }
}

export default async function FeedPage() {
  const feedResult = await getJson<DishFeedResponse>("/api/feed?limit=13");

  return <FeedScreen feed={feedResult.data} isError={feedResult.error} />;
}
