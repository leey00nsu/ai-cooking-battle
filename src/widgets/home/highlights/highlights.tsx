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
        랭킹 보기
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
  const dishName = entry.dishName || "알 수 없는 메뉴";

  return (
    <Link
      className="group rounded-[2rem] border border-white/5 bg-card/90 p-4 shadow-lg transition hover:border-primary/40 hover:shadow-xl"
      href={`/ranking/${dayKey}`}
      onClick={onClick}
    >
      <div className="relative h-52 overflow-hidden rounded-[1.5rem] bg-card">
        {entry.imageUrl ? (
          <img
            alt={`랭킹 #${entry.rank} ${dishName}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            src={entry.imageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card via-background to-black text-xs text-white/40">
            이미지 없음
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/75 px-3 py-1 text-xs font-semibold text-white">
          랭킹 #{entry.rank}
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-base font-black text-primary">
          {formatScore(entry.score)}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between px-2">
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-1 text-lg font-bold leading-tight text-white">{dishName}</h3>
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 text-xs text-white/70">{entry.authorName}</span>
            <span className="text-xs text-white/30">•</span>
            <span className="text-xs text-white/60">랭킹 #{entry.rank}</span>
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
              dishId: entry.dishId,
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
