import { Star, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Surface } from "@/shared/ui/surface";

type RankingHeroProps = {
  dayKey: string;
  themeText: string;
  participantCount: number;
  averageScore: number;
};

function formatAverageScore(value: number) {
  if (!Number.isFinite(value)) {
    return "0.0";
  }
  return value.toFixed(1);
}

export function RankingHero({
  dayKey,
  themeText,
  participantCount,
  averageScore,
}: RankingHeroProps) {
  return (
    <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-3 lg:flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-primary/20 text-primary hover:bg-primary/25">Daily Ranking</Badge>
          <span className="text-white/55">{dayKey}</span>
        </div>
        <h1 className="text-2xl font-black leading-tight text-white md:text-4xl">
          <span className="mr-2 text-white/50">주제:</span>
          {themeText}
        </h1>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 lg:w-[320px] lg:shrink-0">
        <Surface className="min-w-0 space-y-2 p-4" radius="xl" tone="cardMuted">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
            <Users className="h-4 w-4" />
            Participants
          </div>
          <p className="text-2xl font-bold text-white">{participantCount.toLocaleString()}</p>
        </Surface>
        <Surface className="min-w-0 space-y-2 p-4" radius="xl" tone="cardMuted">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
            <Star className="h-4 w-4" />
            Avg Score
          </div>
          <p className="text-2xl font-bold text-white">{formatAverageScore(averageScore)}</p>
        </Surface>
      </div>
    </section>
  );
}
