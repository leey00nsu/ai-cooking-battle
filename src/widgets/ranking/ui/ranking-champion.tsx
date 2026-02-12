"use client";

import Link from "next/link";
import type { RankingEntry } from "@/entities/ranking/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { Button } from "@/shared/ui/button";
import { Surface } from "@/shared/ui/surface";

type RankingChampionProps = {
  dayKey: string;
  entry: RankingEntry;
};

export function RankingChampion({ dayKey, entry }: RankingChampionProps) {
  return (
    <Surface
      className="relative overflow-hidden p-0"
      radius="3xl"
      tone="card"
      stroke="thickPrimary"
    >
      <div className="relative h-[300px] w-full md:h-[420px]">
        <img
          alt={`ranking-champion-${entry.dishName}`}
          className="h-full w-full object-cover"
          src={entry.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />
        <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-black md:left-6 md:top-6">
          #1 Champion
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 p-5 md:p-7">
          <p className="text-sm font-semibold text-primary">{entry.score.toFixed(1)}</p>
          <h2 className="text-2xl font-black text-white md:text-3xl">{entry.dishName}</h2>
          <p className="text-sm text-white/70">{entry.authorName}</p>
          <div>
            <Button asChild className="h-10 px-4 text-sm font-bold" variant="cta">
              <Link
                href={`/dishes/${entry.dishId}`}
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
                    screen: "ranking",
                    section: "champion",
                    dayKey,
                    rank: entry.rank,
                    dishId: entry.dishId,
                  })
                }
              >
                View Analysis
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}
