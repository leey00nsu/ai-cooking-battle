"use client";

import type { MatchFeed, MatchSummary } from "@/entities/match/model/types";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { RestrictedState } from "@/shared/ui/restricted-state";

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

function MatchCard({ match }: { match: MatchSummary }) {
  return (
    <a
      className="group rounded-3xl border border-white/10 bg-neutral-950/60 p-4 transition hover:border-amber-400/40"
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
      <div className="relative grid h-40 grid-cols-2 gap-1 overflow-hidden rounded-2xl">
        <div className="h-full w-full bg-neutral-800">
          {match.leftDishImageUrl ? (
            <img
              alt={`Match left ${match.id}`}
              className="h-full w-full object-cover"
              src={match.leftDishImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-xs text-neutral-500">
              No Image
            </div>
          )}
        </div>
        <div className="h-full w-full bg-neutral-800">
          {match.rightDishImageUrl ? (
            <img
              alt={`Match right ${match.id}`}
              className="h-full w-full object-cover"
              src={match.rightDishImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-xs text-neutral-500">
              No Image
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-black/70 px-4 py-1 text-sm font-semibold text-white shadow">
            <span className="text-amber-300">{formatScore(match.leftScore)}</span>
            <span className="px-2 text-xs text-neutral-400">vs</span>
            <span>{formatScore(match.rightScore)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-neutral-300">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          {match.dayKey}
        </span>
        {match.isPractice ? (
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200">
            연습전
          </span>
        ) : (
          <span className="text-xs text-neutral-400">매치</span>
        )}
      </div>
    </a>
  );
}

export default function MatchGrid({ matchFeed, isError, isRestricted }: MatchGridProps) {
  if (isRestricted) {
    return (
      <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white">Fresh Out the Oven</h2>
        <div className="mt-4">
          <RestrictedState title="매치 제한" description="현재 매치를 볼 수 없습니다." />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white">Fresh Out the Oven</h2>
        <div className="mt-4">
          <ErrorState title="매치 오류" description="잠시 후 다시 시도해주세요." />
        </div>
      </section>
    );
  }

  if (!matchFeed || matchFeed.items.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white">Fresh Out the Oven</h2>
        <div className="mt-4">
          <EmptyState title="매치가 없습니다" description="오늘의 매치가 아직 없습니다." />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Fresh Out the Oven</h2>
          <p className="mt-2 text-sm text-neutral-400">최신 매치 {matchFeed.items.length}개</p>
        </div>
        <a className="text-sm font-semibold text-amber-300 transition hover:text-amber-200" href="/feed">
          View Feed
        </a>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {matchFeed.items.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
