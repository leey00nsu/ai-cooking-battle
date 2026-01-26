import type { SlotSummary } from "@/entities/slot/model/types";

type SlotSummaryProps = {
  summary: SlotSummary | null;
};

export default function SlotSummary({ summary }: SlotSummaryProps) {
  const freeTotal = summary?.freeLimit ?? 0;
  const freeUsed = summary?.freeUsedCount ?? 0;
  const adTotal = summary?.adLimit ?? 0;
  const adUsed = summary?.adUsedCount ?? 0;
  const freeRemaining = Math.max(freeTotal - freeUsed, 0);
  const adRemaining = Math.max(adTotal - adUsed, 0);
  const freePercent = freeTotal > 0 ? Math.min((freeRemaining / freeTotal) * 100, 100) : 0;
  const adPercent = adTotal > 0 ? Math.min((adRemaining / adTotal) * 100, 100) : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Slots
        </p>
        <span className="text-xs text-neutral-500">00:00(KST) 리셋</span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm text-neutral-300">
            <span>무료 슬롯</span>
            <span>
              {freeRemaining} / {freeTotal}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${freePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-neutral-300">
            <span>광고 슬롯</span>
            <span>
              {adRemaining} / {adTotal}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${adPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
