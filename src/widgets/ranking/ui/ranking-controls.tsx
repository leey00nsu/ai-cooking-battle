"use client";

import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Surface } from "@/shared/ui/surface";

type RankingControlsProps = {
  dayKey: string;
  search: string;
  onDayKeyChange: (nextDayKey: string) => void;
  onSearchChange: (nextSearch: string) => void;
};

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDayKey(dayKey: string) {
  const matched = DAY_KEY_PATTERN.exec(dayKey.trim());
  if (!matched) {
    return undefined;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(year, month - 1, day);

  const isValid =
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;

  return isValid ? parsed : undefined;
}

function toDayKey(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RankingControls({
  dayKey,
  search,
  onDayKeyChange,
  onSearchChange,
}: RankingControlsProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedDate = parseDayKey(dayKey);
  const displayDayKey = selectedDate ? toDayKey(selectedDate) : dayKey;

  const openCalendar = () => {
    setIsCalendarOpen(true);
  };

  return (
    <Surface className="space-y-4 p-4 md:p-5" radius="2xl" tone="cardMuted">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-4 md:w-full md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              Calendar
            </p>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-start rounded-xl border-white/10 bg-background px-3 text-left text-sm text-white hover:bg-background"
                  aria-label="달력 열기"
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-white/55" />
                  {displayDayKey}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto rounded-2xl border-white/10 bg-card/95 p-2 text-white"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(nextDate) => {
                    if (!nextDate) {
                      return;
                    }
                    onDayKeyChange(toDayKey(nextDate));
                    setIsCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="ranking-search-input"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55"
            >
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                id="ranking-search-input"
                variant="ranking"
                className="pl-10"
                placeholder="요리명 검색"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="inline-flex h-auto items-center gap-1 self-start p-0 text-sm font-semibold text-primary hover:bg-transparent hover:text-primary/85 md:self-auto"
          onClick={openCalendar}
        >
          View Full Calendar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Surface>
  );
}
