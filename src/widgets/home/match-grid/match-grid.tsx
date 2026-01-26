import type { MatchFeed } from "@/entities/match/model/types";
import { EmptyState } from "@/shared/ui/empty-state";

type MatchGridProps = {
  matchFeed: MatchFeed | null;
};

export default function MatchGrid({ matchFeed }: MatchGridProps) {
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
      <h2 className="text-lg font-semibold text-white">Fresh Out the Oven</h2>
      <p className="mt-2 text-sm text-neutral-400">
        최신 매치 {matchFeed.items.length}개
      </p>
    </section>
  );
}
