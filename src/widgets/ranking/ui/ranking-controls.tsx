"use client";

import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { useRef } from "react";
import { Surface } from "@/shared/ui/surface";

type RankingControlsProps = {
  dayKey: string;
  search: string;
  onDayKeyChange: (nextDayKey: string) => void;
  onSearchChange: (nextSearch: string) => void;
};

export function RankingControls({
  dayKey,
  search,
  onDayKeyChange,
  onSearchChange,
}: RankingControlsProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const openCalendar = () => {
    const input = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) {
      return;
    }
    input.showPicker?.();
    input.focus();
  };

  return (
    <Surface className="space-y-4 p-4 md:p-5" radius="2xl" tone="cardMuted">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-4 md:w-full md:grid-cols-2">
          <label className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              Calendar
            </p>
            <div className="relative">
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-primary"
                aria-label="달력 열기"
                onClick={openCalendar}
              >
                <CalendarDays className="h-4 w-4" />
              </button>
              <input
                ref={dateInputRef}
                className="h-11 w-full rounded-xl border border-white/10 bg-background px-10 text-sm text-white outline-none transition focus:border-primary/60 [&::-webkit-calendar-picker-indicator]:pointer-events-none [&::-webkit-calendar-picker-indicator]:opacity-0"
                type="date"
                value={dayKey}
                onChange={(event) => onDayKeyChange(event.target.value)}
              />
            </div>
          </label>
          <label className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              Search
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                className="h-11 w-full rounded-xl border border-white/10 bg-background px-10 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-primary/60"
                placeholder="요리명 검색"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </label>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primary transition hover:text-primary/85 md:self-auto"
          onClick={openCalendar}
        >
          View Full Calendar
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </Surface>
  );
}
