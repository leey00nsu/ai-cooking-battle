import { cn } from "@/shared/lib/utils";
import { Surface } from "@/shared/ui/surface";

type MetricItem = {
  label: string;
  value: string;
};

type MetricStripProps = {
  items: MetricItem[];
  className?: string;
};

function MetricStrip({ items, className }: MetricStripProps) {
  return (
    <Surface tone="soft" radius="xl" className={cn("flex items-stretch p-1.5", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-[78px] border-r border-white/10 px-3 py-1.5 text-center last:border-r-0"
        >
          <p className="text-xl font-bold leading-none text-white">{item.value}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
            {item.label}
          </p>
        </div>
      ))}
    </Surface>
  );
}

export type { MetricItem };
export { MetricStrip };
