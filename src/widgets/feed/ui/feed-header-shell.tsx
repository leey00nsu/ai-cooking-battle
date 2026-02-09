import Link from "next/link";
import { type FeedFilters, toFeedPageSearchParams } from "@/entities/feed/model/feed-filters";
import { Button } from "@/shared/ui/button";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

type FeedHeaderShellProps = {
  filters: FeedFilters;
  mineUnauthorized?: boolean;
};

function toFeedHref(filters: FeedFilters) {
  const query = toFeedPageSearchParams(filters).toString();
  return `/feed${query ? `?${query}` : ""}`;
}

function FeedHeaderShell({ filters, mineUnauthorized }: FeedHeaderShellProps) {
  const allFilters: FeedFilters = {
    ...filters,
    mine: false,
    excludeBots: false,
  };
  const mineFilters: FeedFilters = {
    ...filters,
    mine: !filters.mine,
  };
  const excludeBotsFilters: FeedFilters = {
    ...filters,
    excludeBots: !filters.excludeBots,
  };

  const allHref = toFeedHref(allFilters);
  const mineHref = toFeedHref(mineFilters);
  const excludeBotsHref = toFeedHref(excludeBotsFilters);

  const isAllActive = !filters.mine && !filters.excludeBots;

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Dish Feed"
        description="Latest creations from the AI Cooking Battle kitchen."
      />
      <Surface className="flex flex-wrap items-center gap-2 p-3" radius="2xl" tone="soft">
        <Button
          asChild
          className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
          variant={isAllActive ? "cta" : "outline"}
        >
          <Link href={allHref}>All Dishes</Link>
        </Button>
        <Button
          asChild
          className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
          variant={filters.mine ? "cta" : "outline"}
        >
          <Link href={mineHref}>My Dishes</Link>
        </Button>
        <Button
          asChild
          className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
          variant={filters.excludeBots ? "cta" : "outline"}
        >
          <Link href={excludeBotsHref}>Exclude Bots</Link>
        </Button>
      </Surface>
      {mineUnauthorized ? (
        <Surface className="px-4 py-3 text-sm text-red-100" radius="xl" tone="overlayDanger">
          Mine 필터는 로그인 후 사용할 수 있습니다. 현재 전체 요리를 표시합니다.
        </Surface>
      ) : null}
    </div>
  );
}

export { FeedHeaderShell };
