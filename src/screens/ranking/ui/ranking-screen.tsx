"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RankingArchiveResponse } from "@/entities/ranking/model/types";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { RankingChampion } from "@/widgets/ranking/ui/ranking-champion";
import { RankingControls } from "@/widgets/ranking/ui/ranking-controls";
import {
  RankingEmptyState,
  RankingErrorState,
  RankingRestrictedState,
} from "@/widgets/ranking/ui/ranking-fetch-states";
import { RankingHero } from "@/widgets/ranking/ui/ranking-hero";
import { RankingKeywordsPanel } from "@/widgets/ranking/ui/ranking-keywords-panel";
import { RankingTopList } from "@/widgets/ranking/ui/ranking-top-list";
import RankingAnalytics from "./ranking-analytics";

type RankingStatus = "ready" | "empty" | "error" | "restricted";

type RankingScreenProps = {
  dayKey: string;
  initialData: RankingArchiveResponse | null;
  status: RankingStatus;
};

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RANKING_ARCHIVE_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 350;

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

export default function RankingScreen({ dayKey, initialData, status }: RankingScreenProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RankingArchiveResponse | null>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const bootstrappedRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const hasMore = (data?.nextOffset ?? null) !== null;
  const items = data?.items ?? [];
  const champion = items[0] ?? null;
  const runnersUp = items.slice(1);
  const resolvedThemeText = data?.themeText?.trim() || "오늘의 주제";
  const participantCount = data?.participantCount ?? 0;
  const averageScore = data?.averageScore ?? 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      return;
    }

    const controller = new AbortController();
    setIsRefreshing(true);
    setStreamError(false);

    fetchRankingArchive({ dayKey, search, offset: 0, signal: controller.signal })
      .then((nextData) => {
        setData(nextData);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[ranking] failed to refresh archive", error);
        setStreamError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [dayKey, search]);

  const loadMore = useCallback(async () => {
    if (!data || data.nextOffset === null || isLoadingMore || isRefreshing) {
      return;
    }

    setIsLoadingMore(true);
    setStreamError(false);
    try {
      const nextPage = await fetchRankingArchive({
        dayKey,
        search,
        offset: data.nextOffset,
      });

      setData((previous) => {
        if (!previous) {
          return nextPage;
        }
        const knownDishIds = new Set(previous.items.map((item) => item.dishId));
        const appendedItems = nextPage.items.filter((item) => !knownDishIds.has(item.dishId));
        return {
          ...nextPage,
          items: [...previous.items, ...appendedItems],
        };
      });
    } catch (error) {
      console.error("[ranking] failed to fetch next page", error);
      setStreamError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, dayKey, isLoadingMore, isRefreshing, search]);

  const handleLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node || !hasMore) {
        return;
      }
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first?.isIntersecting) {
            void loadMore();
          }
        },
        { rootMargin: "280px" },
      );
      observerRef.current.observe(node);
    },
    [hasMore, loadMore],
  );

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
    },
    [],
  );

  const handleDayKeyChange = (nextDayKey: string) => {
    const normalized = nextDayKey.trim();
    if (!DAY_KEY_PATTERN.test(normalized) || normalized === dayKey) {
      return;
    }
    router.push(`/ranking/${normalized}`);
  };

  const isSearchEmptyState =
    status === "ready" && search.length > 0 && !isRefreshing && items.length === 0;

  const isGenericEmptyState =
    !isRefreshing && items.length === 0 && (status === "empty" || (status === "ready" && !search));

  const shouldShowFetchStates = useMemo(() => {
    if (status === "restricted" || status === "error") {
      return true;
    }
    if (isGenericEmptyState || isSearchEmptyState) {
      return true;
    }
    return false;
  }, [isGenericEmptyState, isSearchEmptyState, status]);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6 px-4 pb-16 pt-24 md:px-8">
        <RankingAnalytics dayKey={dayKey} status={status} totalItems={items.length} />

        <RankingControls
          dayKey={dayKey}
          search={searchInput}
          onDayKeyChange={handleDayKeyChange}
          onSearchChange={setSearchInput}
        />

        {streamError ? (
          <p className="text-sm text-red-300">
            일부 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : null}

        {isRefreshing ? <p className="text-xs text-white/55">검색 결과를 불러오는 중...</p> : null}

        {shouldShowFetchStates ? (
          <>
            {status === "restricted" ? <RankingRestrictedState /> : null}
            {status === "error" ? <RankingErrorState /> : null}
            {isGenericEmptyState ? <RankingEmptyState /> : null}
            {isSearchEmptyState ? (
              <EmptyState
                title="검색 결과가 없습니다"
                description={`"${search}"에 해당하는 요리가 없습니다.`}
                action={
                  <Button
                    className="h-9 px-4 text-sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                    }}
                  >
                    검색 초기화
                  </Button>
                }
              />
            ) : null}
          </>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-9">
              <RankingHero
                dayKey={dayKey}
                themeText={resolvedThemeText}
                participantCount={participantCount}
                averageScore={averageScore}
              />
              {champion ? <RankingChampion dayKey={dayKey} entry={champion} /> : null}
              <RankingTopList
                dayKey={dayKey}
                items={runnersUp}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                loadMoreRef={handleLoadMoreRef}
              />
            </div>
            <div className="lg:col-span-3">
              <RankingKeywordsPanel groups={data?.keywordGroups ?? []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
