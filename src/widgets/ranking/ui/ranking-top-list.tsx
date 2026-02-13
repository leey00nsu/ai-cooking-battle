"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import type { RankingEntry } from "@/entities/ranking/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

type RankingTopListProps = {
  dayKey: string;
  items: RankingEntry[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreRef: (node: HTMLDivElement | null) => void;
};

export function RankingTopList({
  dayKey,
  items,
  hasMore,
  isLoadingMore,
  loadMoreRef,
}: RankingTopListProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Hall of Fame"
        description={`Archive ${dayKey} · ${items.length} Dishes`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((entry) => (
          <Surface
            key={`${dayKey}-${entry.rank}`}
            className="overflow-hidden p-0"
            radius="2xl"
            tone="cardMuted"
            interactive="border"
          >
            <div className="relative h-44 w-full bg-card">
              <img
                alt={`rank-${entry.rank}-${entry.dishName}`}
                className="h-full w-full object-cover"
                src={entry.imageUrl}
              />
              <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                #{entry.rank}
              </div>
              <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-sm font-black text-primary">
                {entry.score.toFixed(1)}
              </div>
            </div>
            <div className="space-y-1 p-4">
              <div className="flex items-center gap-2">
                <Avatar className="size-6 border-white/20 bg-white/10">
                  <AvatarFallback className="text-[10px] font-semibold">
                    {entry.authorName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="line-clamp-1 text-xs text-white/65">{entry.authorName}</p>
              </div>
              <p className="line-clamp-1 text-base font-bold text-white">{entry.dishName}</p>
              <Button asChild className="mt-3 h-9 w-full gap-2 text-sm" variant="outline">
                <Link
                  href={`/dishes/${entry.dishId}`}
                  onClick={() =>
                    trackEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
                      screen: "ranking",
                      section: "top_list",
                      dayKey,
                      rank: entry.rank,
                      dishId: entry.dishId,
                    })
                  }
                >
                  <Eye className="h-4 w-4" />
                  View Dish
                </Link>
              </Button>
            </div>
          </Surface>
        ))}
      </div>

      {isLoadingMore ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Surface
              key={`ranking-more-loading-${index + 1}`}
              className="space-y-3 p-4"
              radius="2xl"
              tone="cardMuted"
            >
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </Surface>
          ))}
        </div>
      ) : null}

      {hasMore ? <div ref={loadMoreRef} className="h-8 w-full" aria-hidden /> : null}
    </section>
  );
}
