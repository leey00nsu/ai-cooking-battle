"use client";

import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { SlotSummary } from "@/entities/slot/model/types";
import { useCreateFlow } from "@/features/create-flow/model/use-create-flow";
import AdRewardCard from "@/screens/create/ui/ad-reward-card";
import { fetchJson } from "@/shared/lib/fetch-json";
import { ADS_ENABLED } from "@/shared/lib/slot-policy";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import PreviewPanel from "@/widgets/create/preview-panel";
import StatusPanel, { type StepItem } from "@/widgets/create/status-panel";

type CreateFormValues = {
  prompt: string;
};

const fallbackSteps: StepItem[] = [
  {
    title: "Prompt Validation",
    description: "Waiting for prompt",
    status: "idle",
  },
  {
    title: "Slot Reservation",
    description: "Queued",
    status: "idle",
  },
  {
    title: "AI Cooking",
    description: "Estimated: 12s",
    status: "idle",
  },
  {
    title: "Safety Check",
    description: "Final polish",
    status: "idle",
  },
];

export default function CreateScreen() {
  const { state, steps, start, recoverByRequestId } = useCreateFlow();
  const hasAutoRecoveredRef = useRef(false);
  const [adRewardId, setAdRewardId] = useState<string | null>(null);
  const {
    data: slotSummary,
    isError: isSlotSummaryError,
    isPending: isSlotSummaryLoading,
    refetch: refetchSlotSummary,
  } = useQuery<SlotSummary>({
    queryKey: ["slots", "summary"],
    queryFn: () => fetchJson<SlotSummary>("/api/slots/summary"),
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateFormValues>({
    defaultValues: {
      prompt: "",
    },
  });
  const promptValue = watch("prompt") ?? "";
  const promptLength = promptValue.length;
  const promptError = errors.prompt?.message;
  const isProcessing = ["validating", "reserving", "generating", "safety"].includes(state.step);
  const freeLimit = slotSummary?.freeLimit;
  const freeUsedCount = slotSummary?.freeUsedCount;
  const canUseFreeSlotToday = slotSummary?.canUseFreeSlotToday;
  const freeDailyLimit = slotSummary?.freeDailyLimit;
  const activeFreeReservationCount = slotSummary?.activeFreeReservationCount;
  const freeSlotCaption = isSlotSummaryError
    ? "오늘 무료 슬롯 상태를 확인할 수 없습니다."
    : isSlotSummaryLoading
      ? "오늘 무료 슬롯 상태를 불러오는 중입니다."
      : canUseFreeSlotToday
        ? freeDailyLimit && typeof activeFreeReservationCount === "number" && freeDailyLimit > 1
          ? `오늘 무료 슬롯 ${activeFreeReservationCount}/${freeDailyLimit} 사용`
          : "오늘 무료 슬롯을 사용 가능합니다"
        : "오늘 무료 슬롯을 모두 사용했습니다";

  const handleFormSubmit = (data: CreateFormValues) => {
    hasAutoRecoveredRef.current = false;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.hash) {
        url.hash = "";
        window.history.replaceState(null, "", url);
      }
    }
    void start(data.prompt, { adRewardId: adRewardId ?? undefined });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (hasAutoRecoveredRef.current) {
      return;
    }
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash) {
      return;
    }
    const params = new URLSearchParams(hash);
    const requestId = (params.get("requestId") ?? "").trim();
    if (!requestId) {
      return;
    }

    hasAutoRecoveredRef.current = true;
    void recoverByRequestId(requestId);
  }, [recoverByRequestId]);

  useEffect(() => {
    const requestId = state.requestId?.trim() ?? "";
    if (!requestId) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    const current = new URLSearchParams(url.hash.replace(/^#/, "")).get("requestId") ?? "";
    if (current === requestId) {
      return;
    }
    url.hash = `requestId=${encodeURIComponent(requestId)}`;
    window.history.replaceState(null, "", url);
  }, [state.requestId]);

  useEffect(() => {
    if (!adRewardId) {
      return;
    }
    if (["generating", "safety", "done"].includes(state.step)) {
      setAdRewardId(null);
    }
  }, [adRewardId, state.step]);

  useEffect(() => {
    if (!["idle", "done", "error"].includes(state.step)) {
      return;
    }
    void refetchSlotSummary();
  }, [refetchSlotSummary, state.step]);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">Chef&apos;s Station</h2>
              <div className="rounded-2xl border border-white/10 bg-card/60 px-4 py-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  <Zap className="h-3.5 w-3.5 text-orange-400" />
                  {isSlotSummaryError
                    ? "Today Slots --/--"
                    : isSlotSummaryLoading
                      ? "Today Slots Loading..."
                      : `Today Slots ${freeUsedCount}/${freeLimit}`}
                </div>
                <p className="mt-1 text-[10px] text-white/55">{freeSlotCaption}</p>
              </div>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit(handleFormSubmit)}>
              <Card tone="solid">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                    Dish Prompt
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-card/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                      Prompt Guide
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
                      {promptLength} / 500
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Textarea
                    {...register("prompt", {
                      required: "프롬프트를 입력해주세요.",
                      maxLength: {
                        value: 500,
                        message: "프롬프트는 500자 이내로 작성해주세요.",
                      },
                    })}
                    maxLength={500}
                    placeholder="Describe a legendary dish..."
                    intent="panel"
                    aria-invalid={!!promptError}
                    className={cn(
                      promptError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
                        : "",
                    )}
                  />
                  {promptError ? <p className="mt-2 text-xs text-red-400">{promptError}</p> : null}
                  <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                    <span>History</span>
                    <span>Inspire Me</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                intent="cta"
                type="submit"
                className="h-14 text-base"
                disabled={isProcessing}
                aria-busy={isProcessing}
              >
                Verify &amp; Generate
              </Button>
            </form>

            {ADS_ENABLED ? <AdRewardCard onRewardGranted={setAdRewardId} /> : null}
          </section>

          <aside className="flex flex-col gap-6 lg:col-span-5">
            <StatusPanel
              errorMessage={state.errorMessage ?? undefined}
              steps={steps.length ? steps : fallbackSteps}
            />
            <PreviewPanel imageUrl={state.imageUrl} isBlurred={state.step !== "done"} />
          </aside>
        </div>
      </main>
    </div>
  );
}
