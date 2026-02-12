import Link from "next/link";
import type { SnapshotEntry } from "@/entities/snapshot/model/types";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";

type SnapshotTopListProps = {
  dayKey: string;
  items: SnapshotEntry[];
};

export function SnapshotTopList({ dayKey, items }: SnapshotTopListProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Hall of Fame"
        description={`Archive ${dayKey} · Top ${items.length}`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((entry) => (
          <Surface
            key={`${dayKey}-${entry.rank}`}
            className="overflow-hidden p-0"
            radius="2xl"
            tone="cardMuted"
            interactive="border"
          >
            <div className="relative h-44 w-full bg-card">
              <img
                alt={`rank-${entry.rank}-${entry.dishName}`}
                className="h-full w-full object-cover"
                src={entry.imageUrl}
              />
              <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                #{entry.rank}
              </div>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-sm font-semibold text-primary">{entry.score.toFixed(1)}</p>
              <p className="line-clamp-1 text-base font-bold text-white">{entry.dishName}</p>
              <p className="line-clamp-1 text-xs text-white/60">{entry.authorName}</p>
              <Link
                className="inline-flex pt-2 text-sm font-semibold text-white underline underline-offset-4"
                href={`/dishes/${entry.dishId}`}
              >
                상세 보기
              </Link>
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
}
