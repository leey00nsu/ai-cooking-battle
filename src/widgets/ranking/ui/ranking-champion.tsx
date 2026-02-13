"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import type { RankingEntry } from "@/entities/ranking/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Surface } from "@/shared/ui/surface";

type RankingChampionProps = {
  dayKey: string;
  entry: RankingEntry;
};

export function RankingChampion({ dayKey, entry }: RankingChampionProps) {
  const initials = entry.authorName.slice(0, 2).toUpperCase();

  return (
    <Surface
      className="relative overflow-hidden p-0"
      radius="3xl"
      tone="accentSoft"
      shadow="glowSm"
      stroke="thickPrimary"
    >
      <div className="relative h-[360px] w-full bg-black md:h-[500px]">
        <img
          alt={`ranking-champion-${entry.dishName}`}
          className="h-full w-full bg-black object-contain"
          src={entry.imageUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/15" />

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-black md:left-6 md:top-6">
          <Trophy className="h-4 w-4" />
          #1 Champion
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border-white/20 bg-white/10">
                  <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-white">{entry.authorName}</p>
                  <p className="text-xs text-white/55">Hall of Fame Champion</p>
                </div>
              </div>
              <h2 className="max-w-2xl text-2xl font-black leading-tight text-white md:text-3xl">
                {entry.dishName}
              </h2>
            </div>

            <div className="flex items-end justify-between gap-4 md:flex-col md:items-end">
              <div className="space-y-1 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                  Final Score
                </p>
                <p className="text-4xl font-black leading-none text-primary md:text-5xl">
                  {entry.score.toFixed(1)}
                </p>
              </div>
              <Button asChild className="h-11 px-5 text-sm font-bold" variant="cta">
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
      </div>
    </Surface>
  );
}
