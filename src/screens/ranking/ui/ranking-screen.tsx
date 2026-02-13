"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import type { RankingArchiveResponse } from "@/entities/ranking/model/types";
import { useRankingArchiveQuery } from "@/features/ranking/archive/model/use-ranking-archive-query";
import { useIntersection } from "@/shared/lib/hooks/use-intersection";
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

export default function RankingScreen({ dayKey, initialData, status }: RankingScreenProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const canQuery =
    status !== "restricted" && status !== "error" && (status === "ready" || search.length > 0);

  const {
    data: queryData,
    hasNextPage: hasMore = false,
    isFetching,
    isFetchingNextPage: isLoadingMore,
    isPending: isPendingQuery,
    isError: streamError,
    fetchNextPage,
  } = useRankingArchiveQuery({
    dayKey,
    search,
    initialData,
    enabled: canQuery,
  });

  const mergedData = queryData
    ? {
        ...queryData.pages[queryData.pages.length - 1],
        items: queryData.pages.flatMap((page) => page.items),
      }
    : null;

  const isRefreshing = isFetching && !isLoadingMore;
  const isQueryPending = canQuery && isPendingQuery;

  const setLoadMoreTarget = useIntersection<HTMLDivElement>({
    enabled: hasMore && !isLoadingMore,
    rootMargin: "280px",
    onIntersect: () => {
      void fetchNextPage();
    },
  });

  const items = mergedData?.items ?? [];
  const champion = items[0] ?? null;
  const runnersUp = items.slice(1);
  const resolvedThemeText = mergedData?.themeText?.trim() || "오늘의 주제";
  const participantCount = mergedData?.participantCount ?? 0;
  const averageScore = mergedData?.averageScore ?? 0;

  const handleDayKeyChange = (nextDayKey: string) => {
    const normalized = nextDayKey.trim();
    if (!DAY_KEY_PATTERN.test(normalized) || normalized === dayKey) {
      return;
    }
    router.push(`/ranking/${normalized}`);
  };

  const isSearchEmptyState =
    canQuery && search.length > 0 && !isRefreshing && !isQueryPending && items.length === 0;

  const isGenericEmptyState =
    status !== "restricted" &&
    status !== "error" &&
    !isRefreshing &&
    !isQueryPending &&
    items.length === 0 &&
    (status === "empty" || search.length === 0);

  const shouldShowFetchStates =
    status === "restricted" || status === "error" || isGenericEmptyState || isSearchEmptyState;

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
                loadMoreRef={setLoadMoreTarget}
              />
            </div>
            <div className="lg:col-span-3">
              <RankingKeywordsPanel groups={mergedData?.keywordGroups ?? []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
