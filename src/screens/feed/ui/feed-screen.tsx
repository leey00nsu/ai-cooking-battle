import type { DishFeedResponse } from "@/entities/feed/model/types";
import { FeedHeaderShell } from "@/widgets/feed/ui/feed-header-shell";
import { FeedSpotlightShell } from "@/widgets/feed/ui/feed-spotlight-shell";
import { RecentDishesShell } from "@/widgets/feed/ui/recent-dishes-shell";

type FeedScreenProps = {
  feed: DishFeedResponse | null;
  isError?: boolean;
};

export default function FeedScreen({ feed, isError }: FeedScreenProps) {
  const spotlight = feed?.items[0] ?? null;
  const recentDishes = feed?.items.slice(1) ?? [];

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <FeedHeaderShell />
        <div className="grid grid-cols-1 gap-8">
          <FeedSpotlightShell item={spotlight} isError={isError} />
          <RecentDishesShell items={recentDishes} />
        </div>
      </main>
    </div>
  );
}
