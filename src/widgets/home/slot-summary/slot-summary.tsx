import type { SlotSummary } from "@/entities/slot/model/types";

type SlotSummaryProps = {
  summary: SlotSummary | null;
};

export default function SlotSummary({ summary }: SlotSummaryProps) {
  const freeTotal = summary?.freeLimit ?? 0;
  const freeUsed = summary?.freeUsedCount ?? 0;
  const adTotal = summary?.adLimit ?? 0;
  const adUsed = summary?.adUsedCount ?? 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Slots
      </p>
      <div className="mt-2 space-y-1 text-sm text-neutral-300">
        <p>
          Free: {Math.max(freeTotal - freeUsed, 0)} / {freeTotal}
        </p>
        <p>
          Ad: {Math.max(adTotal - adUsed, 0)} / {adTotal}
        </p>
      </div>
    </section>
  );
}
