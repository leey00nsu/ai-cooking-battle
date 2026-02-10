"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FeedFilters,
  isDishFeedSort,
  toFeedPageSearchParams,
} from "@/entities/feed/model/feed-filters";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { formatDayKeyForKST } from "@/shared/lib/day-key";
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

function trackFilterChanged(nextFilters: FeedFilters, source: string) {
  trackEvent(ANALYTICS_EVENTS.FEED_FILTER_CHANGED, {
    screen: "feed",
    dayKey: formatDayKeyForKST(),
    source,
    mine: nextFilters.mine,
    excludeBots: nextFilters.excludeBots,
    hasSearch: nextFilters.search.length > 0,
    sort: nextFilters.sort,
  });
}

const SORT_OPTIONS: Array<{ value: FeedFilters["sort"]; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
];

function FeedHeaderShell({ filters, mineUnauthorized }: FeedHeaderShellProps) {
  const router = useRouter();

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
  const resetHref = "/feed";

  const isAllActive = !filters.mine && !filters.excludeBots;

  const navigateWithTracking = (event: { preventDefault: () => void }, href: string) => {
    event.preventDefault();
    router.push(href);
  };

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
          <Link
            href={allHref}
            onClick={(event) => {
              trackFilterChanged(allFilters, "all_dishes");
              navigateWithTracking(event, allHref);
            }}
          >
            All Dishes
          </Link>
        </Button>
        <Button
          asChild
          className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
          variant={filters.mine ? "cta" : "outline"}
        >
          <Link
            href={mineHref}
            onClick={(event) => {
              trackFilterChanged(mineFilters, "my_dishes");
              navigateWithTracking(event, mineHref);
            }}
          >
            My Dishes
          </Link>
        </Button>
        <Button
          asChild
          className="h-9 px-4 text-xs font-bold uppercase tracking-[0.08em]"
          variant={filters.excludeBots ? "cta" : "outline"}
        >
          <Link
            href={excludeBotsHref}
            onClick={(event) => {
              trackFilterChanged(excludeBotsFilters, "exclude_bots");
              navigateWithTracking(event, excludeBotsHref);
            }}
          >
            Exclude Bots
          </Link>
        </Button>
      </Surface>
      <Surface className="p-3" radius="2xl" tone="soft">
        <form
          action="/feed"
          className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]"
          method="get"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const rawSort = formData.get("sort")?.toString().trim() ?? "latest";
            const nextFilters: FeedFilters = {
              mine: formData.get("mine")?.toString() === "true",
              excludeBots: formData.get("excludeBots")?.toString() === "true",
              search: formData.get("search")?.toString().trim() ?? "",
              sort: isDishFeedSort(rawSort) ? rawSort : "latest",
            };
            trackFilterChanged(nextFilters, "apply");
            router.push(toFeedHref(nextFilters));
          }}
        >
          {filters.mine ? <input name="mine" type="hidden" value="true" /> : null}
          {filters.excludeBots ? <input name="excludeBots" type="hidden" value="true" /> : null}

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            Search
            <input
              className="h-10 rounded-[var(--radius-4xl)] border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-white/40 focus:border-primary/40 focus:outline-none"
              defaultValue={filters.search}
              name="search"
              placeholder="Search dish title"
              type="search"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-white/70">
            Sort
            <select
              className="h-10 rounded-[var(--radius-4xl)] border border-white/10 bg-black/40 px-4 text-sm text-white focus:border-primary/40 focus:outline-none"
              defaultValue={filters.sort}
              name="sort"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button
              className="h-10 px-4 text-xs font-bold uppercase tracking-[0.08em]"
              type="submit"
              variant="cta"
            >
              Apply
            </Button>
            <Button
              asChild
              className="h-10 px-4 text-xs font-bold uppercase tracking-[0.08em]"
              variant="outline"
            >
              <Link
                href={resetHref}
                onClick={(event) => {
                  trackFilterChanged(
                    {
                      mine: false,
                      excludeBots: false,
                      search: "",
                      sort: "latest",
                    },
                    "reset",
                  );
                  navigateWithTracking(event, resetHref);
                }}
              >
                Reset
              </Link>
            </Button>
          </div>
        </form>
      </Surface>
      {mineUnauthorized ? (
        <Surface className="px-4 py-3 text-sm text-red-100" radius="xl" tone="overlayDanger">
          Mine filter is available after login. Showing all dishes for now.
        </Surface>
      ) : null}
    </div>
  );
}

export { FeedHeaderShell };
