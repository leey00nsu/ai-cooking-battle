"use client";

import type { MatchFeed, MatchSummary } from "@/entities/match/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Pill } from "@/shared/ui/pill";
import { RestrictedState } from "@/shared/ui/restricted-state";
import { ArrowRight, Grid3x3, Star } from "lucide-react";

type MatchGridProps = {
  matchFeed: MatchFeed | null;
  isError?: boolean;
  isRestricted?: boolean;
};

function formatScore(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(1);
}

function MatchGridHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <Badge variant="icon">
          <Grid3x3 aria-hidden className="h-5 w-5" />
        </Badge>
        <div>
          <h2 className="text-2xl font-bold leading-tight text-white">Fresh Out the Oven</h2>
          {typeof count === "number" ? (
            <p className="text-sm text-white/60">최신 매치 {count}개</p>
          ) : null}
        </div>
      </div>
      <a
        className="flex items-center gap-1 text-sm font-medium text-white/60 transition hover:text-primary"
        href="/feed"
      >
        View Feed
        <ArrowRight aria-hidden className="h-4 w-4" />
      </a>
    </div>
  );
}

function MatchCard({ match }: { match: MatchSummary }) {
  const backgroundUrl = match.leftDishImageUrl || match.rightDishImageUrl;
  const rating = Math.max(match.leftScore, match.rightScore);
  const scoreLabel = `${formatScore(match.leftScore)} vs ${formatScore(match.rightScore)}`;

  return (
    <a
      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-card"
      href={`/matches/${match.id}`}
      onClick={() =>
        trackEvent(ANALYTICS_EVENTS.MATCH_VIEW, {
          screen: "home",
          matchId: match.id,
          dayKey: match.dayKey,
          isPractice: match.isPractice,
        })
      }
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
      />
      {!backgroundUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-black" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition group-hover:opacity-100" />
      {match.isPractice ? (
        <Pill className="absolute left-3 top-3" size="sm" style="outline" tone="amber">
          연습전
        </Pill>
      ) : null}
      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 transition group-hover:opacity-100">
        <div className="flex items-center gap-1 text-xs font-semibold text-primary">
          <Star aria-hidden className="h-3.5 w-3.5" />
          {formatScore(rating)}
        </div>
        <p className="mt-1 text-sm font-semibold text-white">{scoreLabel}</p>
        <p className="text-xs text-white/60">{match.dayKey}</p>
      </div>
    </a>
  );
}

export default function MatchGrid({ matchFeed, isError, isRestricted }: MatchGridProps) {
  if (isRestricted) {
    return (
      <section className="flex flex-col gap-6">
        <MatchGridHeader />
        <div className="mt-4">
          <RestrictedState title="매치 제한" description="현재 매치를 볼 수 없습니다." />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="flex flex-col gap-6">
        <MatchGridHeader />
        <div className="mt-4">
          <ErrorState title="매치 오류" description="잠시 후 다시 시도해주세요." />
        </div>
      </section>
    );
  }

  if (!matchFeed || matchFeed.items.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <MatchGridHeader />
        <div className="mt-4">
          <EmptyState title="매치가 없습니다" description="오늘의 매치가 아직 없습니다." />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <MatchGridHeader count={matchFeed.items.length} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {matchFeed.items.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
