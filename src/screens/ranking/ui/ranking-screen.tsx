import type { RankingTop } from "@/entities/ranking/model/types";
import { RankingChampion } from "@/widgets/ranking/ui/ranking-champion";
import {
  RankingEmptyState,
  RankingErrorState,
  RankingRestrictedState,
} from "@/widgets/ranking/ui/ranking-fetch-states";
import { RankingHero } from "@/widgets/ranking/ui/ranking-hero";
import { RankingTopList } from "@/widgets/ranking/ui/ranking-top-list";
import RankingAnalytics from "./ranking-analytics";

type RankingScreenProps = {
  dayKey: string;
  rankingTop: RankingTop | null;
  status: "ready" | "empty" | "error" | "restricted";
};

export default function RankingScreen({ dayKey, rankingTop, status }: RankingScreenProps) {
  const items = rankingTop?.items ?? [];
  const champion = items[0] ?? null;
  const runnersUp = items.slice(1);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <RankingAnalytics dayKey={dayKey} status={status} totalItems={items.length} />
        <RankingHero
          dayKey={dayKey}
          totalItems={items.length}
          coverImageUrl={champion?.imageUrl ?? null}
        />

        {status === "restricted" ? <RankingRestrictedState /> : null}

        {status === "error" ? <RankingErrorState /> : null}

        {status === "empty" ? <RankingEmptyState /> : null}

        {status === "ready" && champion ? (
          <RankingChampion dayKey={dayKey} entry={champion} />
        ) : null}
        {status === "ready" && runnersUp.length > 0 ? (
          <RankingTopList dayKey={dayKey} items={runnersUp} />
        ) : null}
      </main>
    </div>
  );
}
