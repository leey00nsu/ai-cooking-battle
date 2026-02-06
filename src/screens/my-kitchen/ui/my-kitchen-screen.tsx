"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MyKitchenResponse } from "@/entities/kitchen/model/types";
import type { MatchFeed } from "@/entities/match/model/types";
import { MyKitchenContent } from "@/screens/my-kitchen/ui/my-kitchen-content";
import { fetchJson } from "@/shared/lib/fetch-json";
import {
  MyKitchenErrorState,
  MyKitchenLoadingState,
} from "@/widgets/my-kitchen/ui/my-kitchen-fetch-states";

type SetRepresentativePayload = { dishId: string; clear?: never } | { clear: true; dishId?: never };

type SetRepresentativeResponse =
  | { ok: true; representativeDishId: string | null }
  | { ok: false; code: string; message: string };

type ToggleActivePayload = {
  isActive: boolean;
};

type ToggleActiveResponse =
  | { ok: true; isActive: boolean; dishId: string }
  | { ok: false; code: string; message: string };

export default function MyKitchenScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery<MyKitchenResponse>({
    queryKey: ["my", "kitchen"],
    queryFn: () => fetchJson<MyKitchenResponse>("/api/my/kitchen"),
  });
  const {
    data: recentMatches,
    isPending: isRecentMatchesPending,
    isError: isRecentMatchesError,
  } = useQuery<MatchFeed>({
    queryKey: ["my", "recent-matches"],
    queryFn: () => fetchJson<MatchFeed>("/api/feed?limit=5"),
  });

  const setRepresentative = useMutation({
    mutationFn: (payload: SetRepresentativePayload) =>
      fetchJson<SetRepresentativeResponse>("/api/my/representative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my", "kitchen"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: (payload: ToggleActivePayload) =>
      fetchJson<ToggleActiveResponse>("/api/my/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my", "kitchen"] });
    },
  });

  if (isPending) {
    return <MyKitchenLoadingState />;
  }

  if (isError || !data || data.ok === false) {
    return <MyKitchenErrorState onRetry={() => void refetch()} />;
  }

  return (
    <MyKitchenContent
      data={data}
      recentMatches={recentMatches?.items ?? []}
      isRecentMatchesPending={isRecentMatchesPending}
      isRecentMatchesError={isRecentMatchesError}
      isSettingRepresentative={setRepresentative.isPending && !setRepresentative.variables?.clear}
      isClearingRepresentative={setRepresentative.isPending && !!setRepresentative.variables?.clear}
      isTogglingActive={toggleActive.isPending}
      onSetRepresentative={(dishId) => {
        setRepresentative.mutate({ dishId });
      }}
      onClearRepresentative={() => {
        setRepresentative.mutate({ clear: true });
      }}
      onToggleActive={(nextIsActive) => {
        toggleActive.mutate({ isActive: nextIsActive });
      }}
    />
  );
}
