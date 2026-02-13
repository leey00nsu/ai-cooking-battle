import { Flame } from "lucide-react";
import type { RankingKeywordGroup } from "@/entities/ranking/model/types";
import { Surface } from "@/shared/ui/surface";

type RankingKeywordsPanelProps = {
  groups: RankingKeywordGroup[];
};

function getFallbackGroups(): RankingKeywordGroup[] {
  return [
    { title: "Dominant Styles", keywords: ["#오늘의랭킹", "#AI요리"] },
    { title: "Top Ingredients", keywords: ["#플레이팅", "#시그니처"] },
  ];
}

export function RankingKeywordsPanel({ groups }: RankingKeywordsPanelProps) {
  const resolvedGroups = groups.length > 0 ? groups : getFallbackGroups();

  return (
    <Surface className="sticky top-24 space-y-5 p-5" radius="2xl" tone="cardMuted">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 text-primary">
        <Flame className="h-5 w-5" />
        <h3 className="text-lg font-bold uppercase tracking-wider text-white">Winning Keywords</h3>
      </div>

      <div className="space-y-5">
        {resolvedGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-white/55">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.keywords.map((keyword) => (
                <span
                  key={`${group.title}-${keyword}`}
                  className="rounded-full border border-white/10 bg-background px-3 py-1 text-xs font-medium text-white/80"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
