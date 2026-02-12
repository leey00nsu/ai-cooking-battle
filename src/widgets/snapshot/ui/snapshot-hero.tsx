import { Surface } from "@/shared/ui/surface";

type SnapshotHeroProps = {
  dayKey: string;
  totalItems: number;
  coverImageUrl?: string | null;
};

export function SnapshotHero({ dayKey, totalItems, coverImageUrl }: SnapshotHeroProps) {
  return (
    <Surface className="relative overflow-hidden p-6 md:p-8" radius="3xl" tone="card">
      {coverImageUrl ? (
        <>
          <img
            alt={`snapshot-cover-${dayKey}`}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            src={coverImageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </>
      ) : null}
      <div className="relative space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Hall of Fame
        </p>
        <h1 className="text-3xl font-black text-white md:text-4xl">Daily Theme Snapshot</h1>
        <p className="text-sm text-white/70">Archive Date: {dayKey}</p>
        <p className="text-sm text-white/60">Top {totalItems} Dishes</p>
      </div>
    </Surface>
  );
}
