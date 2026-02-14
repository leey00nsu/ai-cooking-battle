"use client";

import { ArrowRight, Eye, Trophy } from "lucide-react";
import Link from "next/link";
import type { RankingEntry, RankingTop } from "@/entities/ranking/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { RestrictedState } from "@/shared/ui/restricted-state";

type HighlightsProps = {
  rankingTop: RankingTop | null;
  isError?: boolean;
  isRestricted?: boolean;
};

function formatScore(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(1);
}

function HighlightsHeader({ dayKey }: { dayKey?: string }) {
  const href = dayKey ? `/ranking/${dayKey}` : "/ranking";

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <Badge variant="icon">
          <Trophy aria-hidden className="h-5 w-5" />
        </Badge>
        <h2 className="text-2xl font-bold leading-tight text-white">오늘의 랭킹 — Top Rated</h2>
      </div>
      <Link
        className="flex items-center gap-1 text-sm font-medium text-white/60 transition hover:text-primary"
        href={href}
      >
        View Ranking
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>
  );
}

function HighlightCard({
  entry,
  dayKey,
  onClick,
}: {
  entry: RankingEntry;
  dayKey: string;
  onClick?: () => void;
}) {
  const winnerIsLeft = entry.leftScore > entry.rightScore;
  const winnerLabel = winnerIsLeft ? "Left" : "Right";
  const chefHandle = `@chef-${String(entry.rank).padStart(2, "0")}`;
  const title = `랭킹 #${entry.rank} 대결`;

  return (
    <Link
      className="group rounded-[2rem] border border-white/5 bg-card/90 p-4 shadow-lg transition hover:border-primary/40 hover:shadow-xl"
      href={`/ranking/${dayKey}`}
      onClick={onClick}
    >
      <div className="relative grid h-48 grid-cols-2 gap-1 overflow-hidden rounded-[1.5rem]">
        <div className="h-full w-full bg-card">
          {entry.leftImageUrl ? (
            <img
              alt={`Ranking left ${entry.rank}`}
              className="h-full w-full object-cover"
              src={entry.leftImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card via-background to-black text-xs text-white/40">
              No Image
            </div>
          )}
        </div>
        <div className="h-full w-full bg-card">
          {entry.rightImageUrl ? (
            <img
              alt={`Ranking right ${entry.rank}`}
              className="h-full w-full object-cover"
              src={entry.rightImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card via-background to-black text-xs text-white/40">
              No Image
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="-skew-x-12 rounded-full border border-white/10 bg-black/80 px-4 py-1 text-xl font-black italic text-white shadow-lg">
            <span className="not-italic text-primary">{formatScore(entry.leftScore)}</span>
            <span className="px-2 text-sm font-normal not-italic text-white/50">vs</span>
            <span className="not-italic">{formatScore(entry.rightScore)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between px-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold leading-tight text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Winner: {winnerLabel}
            </span>
            <span className="text-xs text-white/30">•</span>
            <span className="text-xs text-white/60">{chefHandle}</span>
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition group-hover:bg-primary group-hover:text-black">
          <Eye aria-hidden className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default function Highlights({ rankingTop, isError, isRestricted }: HighlightsProps) {
  if (isRestricted) {
    return (
      <section className="flex flex-col gap-6">
        <HighlightsHeader />
        <div className="mt-4">
          <RestrictedState
            title="하이라이트 제한"
            description="현재 하이라이트를 볼 수 없습니다."
          />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="flex flex-col gap-6">
        <HighlightsHeader />
        <div className="mt-4">
          <ErrorState title="하이라이트 오류" description="잠시 후 다시 시도해주세요." />
        </div>
      </section>
    );
  }

  if (!rankingTop || rankingTop.items.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <HighlightsHeader />
        <div className="mt-4">
          <EmptyState title="하이라이트가 없습니다" description="오늘의 Top10이 아직 없습니다." />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <HighlightsHeader dayKey={rankingTop.dayKey} />
      <div className="grid gap-6 md:grid-cols-2">
        {rankingTop.items.map((entry) => {
          const handleClick = () => {
            trackEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
              screen: "home",
              dayKey: rankingTop.dayKey,
              rank: entry.rank,
            });
          };

          return (
            <HighlightCard
              key={`${rankingTop.dayKey}-${entry.rank}`}
              entry={entry}
              dayKey={rankingTop.dayKey}
              onClick={handleClick}
            />
          );
        })}
      </div>
    </section>
  );
}
