import Link from "next/link";
import type { MatchSummary } from "@/entities/match/model/types";
import { cn } from "@/shared/lib/utils";
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
          title="Recent Matches"
          description="최근 매치 결과와 점수 변동"
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
            <ErrorState title="Recent Matches 오류" description="매치를 불러오지 못했습니다." />
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="최근 매치가 없습니다."
              description="매치가 생성되면 여기에 표시됩니다."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {matches.map((match, index) => {
              const isWin = match.leftScore >= match.rightScore;
              const pointDiff = Math.round(Math.abs(match.leftScore - match.rightScore) * 10);
              const pointLabel = `${isWin ? "+" : "-"}${pointDiff}`;
              const opponentLabel = `Chef_${String(index + 1).padStart(2, "0")}`;
              return (
                <li key={match.id}>
                  <Surface asChild tone="soft" radius="lg" interactive="borderAndBackground">
                    <Link
                      href={`/matches/${match.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Surface
                          tone="avatar"
                          radius="full"
                          className="flex h-9 w-9 items-center justify-center text-xs font-bold text-white/80"
                        >
                          {opponentLabel.slice(-2)}
                        </Surface>
                        <div>
                          <p className="text-sm font-semibold text-white">vs. {opponentLabel}</p>
                          <p className="text-xs text-white/60">{match.dayKey}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-xs font-bold",
                            isWin ? "text-emerald-300" : "text-rose-300",
                          )}
                        >
                          {isWin ? "WIN" : "LOSS"}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isWin ? "text-emerald-300" : "text-rose-300",
                          )}
                        >
                          {pointLabel}
                        </p>
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
