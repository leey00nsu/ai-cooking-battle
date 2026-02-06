import { MetricStrip } from "@/shared/ui/metric-strip";
import { Surface } from "@/shared/ui/surface";
import { Switch } from "@/shared/ui/switch";
import type { KitchenStats } from "@/widgets/my-kitchen/model/kitchen-stats";

type MyKitchenHeaderProps = {
  stats: KitchenStats;
  hasRepresentative: boolean;
  isActive: boolean;
  isTogglingActive: boolean;
  onToggleActive: (nextIsActive: boolean) => void;
};

function MyKitchenHeader({
  stats,
  hasRepresentative,
  isActive,
  isTogglingActive,
  onToggleActive,
}: MyKitchenHeaderProps) {
  return (
    <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">MY KITCHEN</h1>
        <p className="mt-3 text-base leading-relaxed text-white/70">
          Manage your Ai-generated Dishes
        </p>
      </div>

      <div className="ml-auto flex w-full flex-wrap items-center justify-center gap-3 xl:w-auto xl:justify-end">
        <MetricStrip
          items={[
            { label: "Dishes", value: String(stats.dishes) },
            { label: "Win Rate", value: stats.winRate === null ? "--" : `${stats.winRate}%` },
            { label: "Streak", value: stats.streak === null ? "--" : String(stats.streak) },
          ]}
        />
        <Surface
          tone="accentSoft"
          radius="full"
          shadow="glowSm"
          className="flex h-[58px] w-[272px] shrink-0 items-center justify-between gap-4 px-4 py-2"
        >
          <div className="flex w-[170px] flex-col leading-tight">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Battle Mode
            </span>
            <span className="truncate text-sm font-medium text-white">
              {hasRepresentative
                ? isActive
                  ? "Currently Active"
                  : "Ready to Activate"
                : "Representative Required"}
            </span>
          </div>
          <Switch
            checked={isActive}
            className="h-8 w-14 data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/20 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-8"
            aria-label={hasRepresentative ? "배틀 모드 전환" : "대표작을 먼저 지정하세요"}
            disabled={!hasRepresentative || isTogglingActive}
            aria-busy={isTogglingActive}
            onCheckedChange={onToggleActive}
          />
        </Surface>
      </div>
    </header>
  );
}

export { MyKitchenHeader };
