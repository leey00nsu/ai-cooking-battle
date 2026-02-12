import type { SnapshotTop } from "@/entities/snapshot/model/types";
import { SnapshotChampion } from "@/widgets/snapshot/ui/snapshot-champion";
import {
  SnapshotEmptyState,
  SnapshotErrorState,
  SnapshotRestrictedState,
} from "@/widgets/snapshot/ui/snapshot-fetch-states";
import { SnapshotHero } from "@/widgets/snapshot/ui/snapshot-hero";
import { SnapshotTopList } from "@/widgets/snapshot/ui/snapshot-top-list";
import SnapshotAnalytics from "./snapshot-analytics";

type SnapshotScreenProps = {
  dayKey: string;
  snapshotTop: SnapshotTop | null;
  status: "ready" | "empty" | "error" | "restricted";
};

export default function SnapshotScreen({ dayKey, snapshotTop, status }: SnapshotScreenProps) {
  const items = snapshotTop?.items ?? [];
  const champion = items[0] ?? null;
  const runnersUp = items.slice(1);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <SnapshotAnalytics dayKey={dayKey} status={status} totalItems={items.length} />
        <SnapshotHero
          dayKey={dayKey}
          totalItems={items.length}
          coverImageUrl={champion?.imageUrl ?? null}
        />

        {status === "restricted" ? <SnapshotRestrictedState /> : null}

        {status === "error" ? <SnapshotErrorState /> : null}

        {status === "empty" ? <SnapshotEmptyState /> : null}

        {status === "ready" && champion ? (
          <SnapshotChampion dayKey={dayKey} entry={champion} />
        ) : null}
        {status === "ready" && runnersUp.length > 0 ? (
          <SnapshotTopList dayKey={dayKey} items={runnersUp} />
        ) : null}
      </main>
    </div>
  );
}
