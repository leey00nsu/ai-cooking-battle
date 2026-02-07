"use client";

import { useMemo, useState } from "react";
import type { MyKitchenResponse } from "@/entities/kitchen/model/types";
import type { MatchSummary } from "@/entities/match/model/types";
import { type CollectionFilter, filterDishes } from "@/widgets/my-kitchen/model/collection-filter";
import { computeKitchenStats } from "@/widgets/my-kitchen/model/kitchen-stats";
import { MyCollectionSection } from "@/widgets/my-kitchen/ui/my-collection-section";
import { MyKitchenHeader } from "@/widgets/my-kitchen/ui/my-kitchen-header";
import { RecentMatchesPanel } from "@/widgets/my-kitchen/ui/recent-matches-panel";
import { RepresentativeSection } from "@/widgets/my-kitchen/ui/representative-section";

type MyKitchenSuccessResponse = Extract<MyKitchenResponse, { ok: true }>;

type MyKitchenContentProps = {
  data: MyKitchenSuccessResponse;
  recentMatches: MatchSummary[];
  isRecentMatchesPending: boolean;
  isRecentMatchesError: boolean;
  isSettingRepresentative: boolean;
  isClearingRepresentative: boolean;
  isTogglingActive: boolean;
  onSetRepresentative: (dishId: string) => void;
  onClearRepresentative: () => void;
  onToggleActive: (nextIsActive: boolean) => void;
};

function MyKitchenContent({
  data,
  recentMatches,
  isRecentMatchesPending,
  isRecentMatchesError,
  isSettingRepresentative,
  isClearingRepresentative,
  isTogglingActive,
  onSetRepresentative,
  onClearRepresentative,
  onToggleActive,
}: MyKitchenContentProps) {
  const [filter, setFilter] = useState<CollectionFilter>("all");

  const representativeDishId = data.representativeDishId;
  const representative = representativeDishId
    ? (data.dishes.find((dish) => dish.id === representativeDishId) ?? null)
    : null;

  const stats = useMemo(
    () => computeKitchenStats(data.dishes.length, recentMatches),
    [data.dishes.length, recentMatches],
  );

  const filteredDishes = useMemo(
    () => filterDishes(data.dishes, filter, representativeDishId),
    [data.dishes, filter, representativeDishId],
  );

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <MyKitchenHeader
          stats={stats}
          hasRepresentative={Boolean(representativeDishId)}
          isActive={data.isActive}
          isTogglingActive={isTogglingActive}
          onToggleActive={onToggleActive}
        />

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <RepresentativeSection
              representative={representative}
              isClearingRepresentative={isClearingRepresentative}
              onClearRepresentative={onClearRepresentative}
            />
            <MyCollectionSection
              dishes={data.dishes}
              filteredDishes={filteredDishes}
              filter={filter}
              representativeDishId={representativeDishId}
              isSettingRepresentative={isSettingRepresentative}
              onSetFilter={setFilter}
              onSetRepresentative={onSetRepresentative}
            />
          </div>

          <RecentMatchesPanel
            matches={recentMatches}
            isPending={isRecentMatchesPending}
            isError={isRecentMatchesError}
          />
        </div>
      </main>
    </div>
  );
}

export { MyKitchenContent };
