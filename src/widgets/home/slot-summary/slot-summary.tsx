"use client";

import type { SlotSummary } from "@/entities/slot/model/types";
import { Card } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { Pill } from "@/shared/ui/pill";
import { RestrictedState } from "@/shared/ui/restricted-state";

type SlotSummaryProps = {
  summary: SlotSummary | null;
  isError?: boolean;
  isRestricted?: boolean;
};

export default function SlotSummary({ summary, isError, isRestricted }: SlotSummaryProps) {
  if (isRestricted) {
    return (
      <Card className="p-6">
        <RestrictedState title="슬롯 제한" description="현재 슬롯 정보를 볼 수 없습니다." />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6">
        <ErrorState title="슬롯 오류" description="잠시 후 다시 시도해주세요." />
      </Card>
    );
  }

  const freeTotal = summary?.freeLimit ?? 0;
  const freeUsed = summary?.freeUsedCount ?? 0;
  const adTotal = summary?.adLimit ?? 0;
  const adUsed = summary?.adUsedCount ?? 0;
  const freeRemaining = Math.max(freeTotal - freeUsed, 0);
  const adRemaining = Math.max(adTotal - adUsed, 0);
  const freePercent = freeTotal > 0 ? Math.min((freeRemaining / freeTotal) * 100, 100) : 0;
  const adPercent = adTotal > 0 ? Math.min((adRemaining / adTotal) * 100, 100) : 0;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="flex flex-col gap-3 p-6" tone="ghost">
        <div className="flex items-center gap-2 text-white/60">
          <Pill size="xs" tone="neutral">
            Free
          </Pill>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Free Slots</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold leading-none text-white">{freeRemaining}</span>
          <span className="mb-0.5 text-lg font-medium text-white/40">/ {freeTotal}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${freePercent}%` }} />
        </div>
        <p className="text-xs text-white/50">00:00(KST) 리셋</p>
      </Card>

      <Card className="relative flex flex-col gap-3 overflow-hidden p-6" tone="accent">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="flex items-center gap-2 text-amber-300">
          <Pill size="xs" tone="amber">
            Ad
          </Pill>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Ad Bonus</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold leading-none text-white">{adRemaining}</span>
          <span className="mb-0.5 text-lg font-medium text-white/40">/ {adTotal}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-amber-400" style={{ width: `${adPercent}%` }} />
        </div>
        <p className="text-xs text-white/50">보상 후 사용 가능</p>
      </Card>
    </section>
  );
}
