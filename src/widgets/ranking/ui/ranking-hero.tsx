import { Surface } from "@/shared/ui/surface";

type RankingHeroProps = {
  dayKey: string;
  totalItems: number;
  coverImageUrl?: string | null;
};

export function RankingHero({ dayKey, totalItems, coverImageUrl }: RankingHeroProps) {
  return (
    <Surface className="relative overflow-hidden p-6 md:p-8" radius="3xl" tone="card">
      {coverImageUrl ? (
        <>
          <img
            alt={`ranking-cover-${dayKey}`}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            src={coverImageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </>
      ) : null}
      <div className="relative space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Daily Ranking
        </p>
        <h1 className="text-3xl font-black text-white md:text-4xl">오늘의 랭킹</h1>
        <p className="text-sm text-white/70">기준 날짜: {dayKey}</p>
        <p className="text-sm text-white/60">Top {totalItems} Dishes</p>
      </div>
    </Surface>
  );
}
