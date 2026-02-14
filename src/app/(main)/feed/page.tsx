import {
  type FeedFilters,
  parseFeedFilters,
  toFeedApiSearchParams,
} from "@/entities/feed/model/feed-filters";
import type { DishFeedResponse } from "@/entities/feed/model/types";
import FeedScreen from "@/screens/feed/ui/feed-screen";
import { getJson } from "@/shared/api/server-fetch";

const FEED_PAGE_LIMIT = 13;

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

  let feedResult = await getJson<DishFeedResponse>(toFeedPath(filters), {
    networkErrorStatus: 500,
  });
  let mineUnauthorized = false;

  if (filters.mine && feedResult.status === 401) {
    mineUnauthorized = true;
    feedResult = await getJson<DishFeedResponse>(
      toFeedPath({
        ...filters,
        mine: false,
      }),
      {
        networkErrorStatus: 500,
      },
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
