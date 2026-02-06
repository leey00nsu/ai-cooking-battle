"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { MyKitchenResponse } from "@/entities/kitchen/model/types";
import { fetchJson } from "@/shared/lib/fetch-json";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton } from "@/shared/ui/skeleton";

type SetRepresentativePayload = {
  dishId: string;
};

type SetRepresentativeResponse =
  | { ok: true; representativeDishId: string }
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

  const setRepresentative = useMutation({
    mutationFn: (payload: SetRepresentativePayload) =>
      fetchJson<SetRepresentativeResponse>("/api/my/representative", {
        method: "POST",
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
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my", "kitchen"] });
    },
  });

  if (isPending) {
    return (
      <div className="bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
                My Kitchen
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Loading...</h2>
            </div>
          </div>

          <Card tone="solid">
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                Representative
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
            <Card tone="solid" className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-2/5" />
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !data || !("ok" in data) || data.ok === false) {
    return (
      <div className="bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
          <ErrorState
            title="내 요리를 불러올 수 없습니다."
            description="잠시 후 다시 시도해 주세요."
            action={
              <Button
                type="button"
                intent="outline"
                className="h-10 px-6"
                onClick={() => void refetch()}
              >
                다시 시도
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const representativeDishId = data.representativeDishId;
  const representative = representativeDishId
    ? (data.dishes.find((dish) => dish.id === representativeDishId) ?? null)
    : null;

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 px-4 pb-16 pt-24 md:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
              My Kitchen
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Manage your dishes
            </h1>
            <p className="mt-2 max-w-[58ch] text-base leading-relaxed text-white/70">
              대표작을 지정하고 출전 상태를 켜면 배틀 참가 자격이 준비됩니다.
            </p>
          </div>
          <Button asChild intent="cta" className="h-12 px-6">
            <Link href="/create">Create New</Link>
          </Button>
        </header>

        <Card tone="solid" className="overflow-hidden">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                Representative
              </CardTitle>
              <p className="mt-2 text-sm text-white/60">
                대표작은 1개만 유지되며, 출전 ON/OFF는 대표작을 기준으로 저장됩니다.
              </p>
            </div>
            <Button
              type="button"
              intent={data.isActive ? "outline" : "cta"}
              className="h-10 min-w-[160px]"
              disabled={!representativeDishId || toggleActive.isPending}
              aria-busy={toggleActive.isPending}
              onClick={() => {
                void toggleActive.mutateAsync({ isActive: !data.isActive });
              }}
            >
              {representativeDishId
                ? data.isActive
                  ? "출전 OFF"
                  : "출전 ON"
                : "대표작을 먼저 지정하세요"}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {representative ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/40 lg:col-span-7">
                  <img
                    alt={representative.prompt}
                    src={representative.imageUrl}
                    className="h-72 w-full object-cover sm:h-80"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                      Your Pick
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-white">{representative.prompt}</h3>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-6 lg:col-span-5">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                      Today Score
                    </p>
                    <p className="mt-3 text-4xl font-bold text-white">
                      {representative.dayScoreToday ?? "--"}
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                      (채점 상세는 후속 기능에서 제공됩니다.)
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                      Actions
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      <Button asChild intent="outline" className="h-11">
                        <Link href={`/dishes/${representative.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="대표작이 없습니다."
                description="아래 컬렉션에서 대표작을 선택해 주세요."
              />
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">My Collection</h2>
              <p className="mt-1 text-sm text-white/60">
                마우스를 올리면 대표작 설정 버튼이 나타납니다.
              </p>
            </div>
          </div>

          {data.dishes.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.dishes.map((dish) => {
                const isRepresentative = dish.id === representativeDishId;
                const isHidden = dish.isHidden;
                return (
                  <Card
                    key={dish.id}
                    tone="solid"
                    className={cn(
                      "group relative overflow-hidden border-white/10 transition hover:border-primary/50",
                      isRepresentative ? "ring-1 ring-primary/40" : "",
                      isHidden ? "opacity-70" : "",
                    )}
                  >
                    <div className="relative">
                      <img
                        alt={dish.prompt}
                        src={dish.imageUrl}
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                      {isRepresentative ? (
                        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                          Representative
                        </div>
                      ) : null}
                      {isHidden ? (
                        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                          Hidden
                        </div>
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                      {!isRepresentative ? (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                          <Button
                            type="button"
                            intent="cta"
                            className="pointer-events-auto h-11 px-6"
                            disabled={setRepresentative.isPending}
                            aria-busy={setRepresentative.isPending}
                            onClick={() => void setRepresentative.mutateAsync({ dishId: dish.id })}
                          >
                            Set as Representative
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <CardContent className="space-y-2 py-5">
                      <h3 className="truncate text-lg font-bold text-white">{dish.prompt}</h3>
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <span>Today Score: {dish.dayScoreToday ?? "--"}</span>
                        <Button asChild intent="ghost" size="sm" className="h-8 px-3">
                          <Link href={`/dishes/${dish.id}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="아직 만든 요리가 없습니다."
              description="Create 페이지에서 첫 요리를 만들어 보세요."
              action={
                <Button asChild intent="cta" className="h-11 px-6">
                  <Link href="/create">Create로 이동</Link>
                </Button>
              }
            />
          )}
        </section>
      </main>
    </div>
  );
}
