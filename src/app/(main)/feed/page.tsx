import { headers } from "next/headers";
import {
  type FeedFilters,
  parseFeedFilters,
  toFeedApiSearchParams,
} from "@/entities/feed/model/feed-filters";
import type { DishFeedResponse } from "@/entities/feed/model/types";
import FeedScreen from "@/screens/feed/ui/feed-screen";

const FEED_PAGE_LIMIT = 13;

type FetchResult<T> = {
  data: T | null;
  error: boolean;
  status: number;
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
      return { data: null, error: true, status: response.status };
    }
    return { data: (await response.json()) as T, error: false, status: response.status };
  } catch {
    return { data: null, error: true, status: 500 };
  }
}

function toFeedPath(filters: FeedFilters) {
  const searchParams = toFeedApiSearchParams(filters, FEED_PAGE_LIMIT);
  return `/api/feed?${searchParams.toString()}`;
}

type FeedPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const resolvedSearchParams = searchParams
    ? searchParams instanceof Promise
      ? await searchParams
      : searchParams
    : undefined;
  const filters = parseFeedFilters(resolvedSearchParams);

  let feedResult = await getJson<DishFeedResponse>(toFeedPath(filters));
  let mineUnauthorized = false;

  if (filters.mine && feedResult.status === 401) {
    mineUnauthorized = true;
    feedResult = await getJson<DishFeedResponse>(
      toFeedPath({
        ...filters,
        mine: false,
      }),
    );
  }

  return (
    <FeedScreen
      feed={feedResult.data}
      filters={filters}
      isError={feedResult.error}
      mineUnauthorized={mineUnauthorized}
    />
  );
}
