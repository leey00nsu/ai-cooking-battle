import Link from "next/link";
import type { MatchSummary } from "@/entities/match/model/types";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

type RecentMatchesPanelProps = {
  matches: MatchSummary[];
  isPending: boolean;
  isError: boolean;
};

function RecentMatchesPanel({ matches, isPending, isError }: RecentMatchesPanelProps) {
  return (
    <Surface
      asChild
      tone="cardMuted"
      radius="2xl"
      className="p-5 xl:sticky xl:top-24 xl:self-start"
    >
      <aside>
        <SectionHeading
          title="Recent Ranking Days"
          description="최근 랭킹 기준일과 점수 변동"
          className="items-start"
        />

        {isPending ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`recent-match-skeleton-${index + 1}`} className="h-16" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-4">
            <ErrorState
              title="Recent Ranking 오류"
              description="랭킹 요약을 불러오지 못했습니다."
            />
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="최근 랭킹 기록이 없습니다."
              description="랭킹 데이터가 생성되면 여기에 표시됩니다."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {matches.map((match) => {
              const topScore = Math.max(match.leftScore, match.rightScore);
              const topScoreLabel = Number.isFinite(topScore) ? topScore.toFixed(1) : "-";
              return (
                <li key={match.id}>
                  <Surface asChild tone="soft" radius="lg" interactive="borderAndBackground">
                    <Link
                      href={`/ranking/${match.dayKey}`}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Surface
                          tone="avatar"
                          radius="full"
                          className="flex h-9 w-9 items-center justify-center text-xs font-bold text-white/80"
                        >
                          RK
                        </Surface>
                        <div>
                          <p className="text-sm font-semibold text-white">Ranking Snapshot</p>
                          <p className="text-xs text-white/60">{match.dayKey}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
                          Top Score
                        </p>
                        <p className="text-sm font-semibold text-primary">{topScoreLabel}</p>
                      </div>
                    </Link>
                  </Surface>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </Surface>
  );
}

export { RecentMatchesPanel };
