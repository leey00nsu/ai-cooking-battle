"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { RankingArchiveResponse } from "@/entities/ranking/model/types";

const RANKING_ARCHIVE_LIMIT = 12;
const RANKING_QUERY_STALE_TIME = 30_000;

async function fetchRankingArchive(args: {
  dayKey: string;
  search: string;
  offset: number;
  signal?: AbortSignal;
}) {
  const query = new URLSearchParams({
    view: "archive",
    limit: String(RANKING_ARCHIVE_LIMIT),
    offset: String(args.offset),
  });
  if (args.search) {
    query.set("search", args.search);
  }

  const response = await fetch(`/api/ranking/${encodeURIComponent(args.dayKey)}?${query}`, {
    cache: "no-store",
    signal: args.signal,
  });

  if (!response.ok) {
    throw new Error("RANKING_FETCH_FAILED");
  }

  return (await response.json()) as RankingArchiveResponse;
}

type UseRankingArchiveQueryParams = {
  dayKey: string;
  search: string;
  initialData: RankingArchiveResponse | null;
  enabled: boolean;
};

export function useRankingArchiveQuery({
  dayKey,
  search,
  initialData,
  enabled,
}: UseRankingArchiveQueryParams) {
  return useInfiniteQuery({
    queryKey: ["ranking", "archive", dayKey, search],
    initialPageParam: 0,
    enabled,
    staleTime: RANKING_QUERY_STALE_TIME,
    refetchOnMount: false,
    queryFn: ({ pageParam, signal }) =>
      fetchRankingArchive({
        dayKey,
        search,
        offset: Number(pageParam),
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    initialData:
      search.length === 0 && initialData
        ? {
            pages: [initialData],
            pageParams: [0],
          }
        : undefined,
  });
}
