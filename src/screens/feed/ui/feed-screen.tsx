import Link from "next/link";
import { type FeedFilters, toFeedPageSearchParams } from "@/entities/feed/model/feed-filters";
import type { DishFeedResponse } from "@/entities/feed/model/types";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Surface } from "@/shared/ui/surface";
import { FeedHeaderShell } from "@/widgets/feed/ui/feed-header-shell";
import { FeedSpotlightShell } from "@/widgets/feed/ui/feed-spotlight-shell";
import { RecentDishesShell } from "@/widgets/feed/ui/recent-dishes-shell";

type FeedScreenProps = {
  feed: DishFeedResponse | null;
  filters: FeedFilters;
  isError?: boolean;
  mineUnauthorized?: boolean;
};

export default function FeedScreen({ feed, filters, isError, mineUnauthorized }: FeedScreenProps) {
  const spotlight = feed?.items[0] ?? null;
  const recentDishes = feed?.items.slice(1) ?? [];
  const retryQuery = toFeedPageSearchParams(filters).toString();
  const retryHref = `/feed${retryQuery ? `?${retryQuery}` : ""}`;
  const isEmpty = !isError && (!feed || feed.items.length === 0);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <FeedHeaderShell filters={filters} mineUnauthorized={mineUnauthorized} />
        {isError ? (
          <Surface className="p-6 md:p-8" radius="3xl" tone="card">
            <ErrorState
              title="피드를 불러오지 못했습니다"
              description="잠시 후 다시 시도해주세요."
              action={
                <Button
                  asChild
                  className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
                  variant="outline"
                >
                  <Link href={retryHref}>다시 시도</Link>
                </Button>
              }
            />
          </Surface>
        ) : isEmpty ? (
          <Surface className="p-6 md:p-8" radius="3xl" tone="cardMuted">
            <EmptyState title="오늘의 요리를 생성중입니다." />
          </Surface>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            <FeedSpotlightShell item={spotlight} />
            <RecentDishesShell items={recentDishes} />
          </div>
        )}
      </main>
    </div>
  );
}
