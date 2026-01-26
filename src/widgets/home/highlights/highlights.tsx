import type { SnapshotEntry, SnapshotTop } from "@/entities/snapshot/model/types";
import { EmptyState } from "@/shared/ui/empty-state";

type HighlightsProps = {
  snapshotTop: SnapshotTop | null;
};

function formatScore(value: number) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(1);
}

function HighlightCard({ entry, dayKey }: { entry: SnapshotEntry; dayKey: string }) {
  return (
    <a
      className="group rounded-3xl border border-white/10 bg-neutral-950/60 p-4 transition hover:border-amber-400/40"
      href={`/snapshot/${dayKey}`}
    >
      <div className="relative grid h-40 grid-cols-2 gap-1 overflow-hidden rounded-2xl">
        <div className="h-full w-full bg-neutral-800">
          {entry.leftImageUrl ? (
            <img
              alt={`Snapshot left ${entry.rank}`}
              className="h-full w-full object-cover"
              src={entry.leftImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-xs text-neutral-500">
              No Image
            </div>
          )}
        </div>
        <div className="h-full w-full bg-neutral-800">
          {entry.rightImageUrl ? (
            <img
              alt={`Snapshot right ${entry.rank}`}
              className="h-full w-full object-cover"
              src={entry.rightImageUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-xs text-neutral-500">
              No Image
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-black/70 px-4 py-1 text-sm font-semibold text-white shadow">
            <span className="text-amber-300">{formatScore(entry.leftScore)}</span>
            <span className="px-2 text-xs text-neutral-400">vs</span>
            <span>{formatScore(entry.rightScore)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-neutral-300">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">Rank</span>
        <span className="text-base font-semibold text-white">#{entry.rank}</span>
      </div>
    </a>
  );
}

export default function Highlights({ snapshotTop }: HighlightsProps) {
  if (!snapshotTop || snapshotTop.items.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold text-white">Battle Highlights</h2>
        <p className="mt-2 text-sm text-neutral-400">Snapshot Top10</p>
        <div className="mt-4">
          <EmptyState title="하이라이트가 없습니다" description="오늘의 Top10이 아직 없습니다." />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Battle Highlights</h2>
          <p className="mt-2 text-sm text-neutral-400">
            Snapshot Top10 {snapshotTop.items.length}개
          </p>
        </div>
        <a
          className="text-sm font-semibold text-amber-300 transition hover:text-amber-200"
          href={`/snapshot/${snapshotTop.dayKey}`}
        >
          View Snapshot
        </a>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {snapshotTop.items.map((entry) => (
          <HighlightCard key={`${snapshotTop.dayKey}-${entry.rank}`} entry={entry} dayKey={snapshotTop.dayKey} />
        ))}
      </div>
    </section>
  );
}
