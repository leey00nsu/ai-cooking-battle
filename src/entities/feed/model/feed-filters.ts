import type { DishFeedSort } from "@/entities/feed/model/types";

const DEFAULT_SORT: DishFeedSort = "latest";
const FEED_SORT_VALUES: DishFeedSort[] = ["latest", "oldest", "title_asc", "title_desc"];

type QueryValue = string | string[] | undefined;

export type FeedFilters = {
  mine: boolean;
  excludeBots: boolean;
  search: string;
  sort: DishFeedSort;
};

function getFirstValue(value: QueryValue) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function toBoolean(value: QueryValue) {
  return getFirstValue(value)?.trim() === "true";
}

function toSearch(value: QueryValue) {
  return getFirstValue(value)?.trim() ?? "";
}

function toSort(value: QueryValue): DishFeedSort {
  const raw = getFirstValue(value)?.trim();
  if (raw && isDishFeedSort(raw)) {
    return raw;
  }
  return DEFAULT_SORT;
}

export function isDishFeedSort(value: string): value is DishFeedSort {
  return FEED_SORT_VALUES.includes(value as DishFeedSort);
}

export function parseFeedFilters(params: Record<string, QueryValue> | undefined): FeedFilters {
  return {
    mine: toBoolean(params?.mine),
    excludeBots: toBoolean(params?.excludeBots),
    search: toSearch(params?.search),
    sort: toSort(params?.sort),
  };
}

export function toFeedApiSearchParams(filters: FeedFilters, limit: number) {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  if (filters.mine) {
    searchParams.set("mine", "true");
  }
  if (filters.excludeBots) {
    searchParams.set("excludeBots", "true");
  }
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.sort !== DEFAULT_SORT) {
    searchParams.set("sort", filters.sort);
  }
  return searchParams;
}

export function toFeedPageSearchParams(filters: FeedFilters) {
  const searchParams = new URLSearchParams();
  if (filters.mine) {
    searchParams.set("mine", "true");
  }
  if (filters.excludeBots) {
    searchParams.set("excludeBots", "true");
  }
  if (filters.search) {
    searchParams.set("search", filters.search);
  }
  if (filters.sort !== DEFAULT_SORT) {
    searchParams.set("sort", filters.sort);
  }
  return searchParams;
}
