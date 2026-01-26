import type { SnapshotTop } from "@/entities/snapshot/model/types";
import { EmptyState } from "@/shared/ui/empty-state";

type HighlightsProps = {
  snapshotTop: SnapshotTop | null;
};

export default function Highlights({ snapshotTop }: HighlightsProps) {
  if (!snapshotTop || snapshotTop.items.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white">Battle Highlights</h2>
        <div className="mt-4">
          <EmptyState title="하이라이트가 없습니다" description="오늘의 Top10이 아직 없습니다." />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold text-white">Battle Highlights</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Snapshot Top10 {snapshotTop.items.length}개
      </p>
    </section>
  );
}
