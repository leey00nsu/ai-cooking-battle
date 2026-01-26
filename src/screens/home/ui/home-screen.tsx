import type { MatchFeed } from "@/entities/match/model/types";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import type { SlotSummary } from "@/entities/slot/model/types";
import type { Theme } from "@/entities/theme/model/types";
import Highlights from "@/widgets/home/highlights/highlights";
import MatchGrid from "@/widgets/home/match-grid/match-grid";
import SlotSummaryPanel from "@/widgets/home/slot-summary/slot-summary";
import StatusPanel from "@/widgets/home/status-panel/status-panel";
import ThemeHero from "@/widgets/home/theme-hero/theme-hero";

type HomeScreenProps = {
  theme: Theme | null;
  slotSummary: SlotSummary | null;
  snapshotTop: SnapshotTop | null;
  matchFeed: MatchFeed | null;
  userStatus: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
  isRestricted?: boolean;
  isThemeError?: boolean;
  isSlotError?: boolean;
  isSnapshotError?: boolean;
  isMatchError?: boolean;
};

export default function HomeScreen({
  theme,
  slotSummary,
  snapshotTop,
  matchFeed,
  userStatus,
  isRestricted,
  isThemeError,
  isSlotError,
  isSnapshotError,
  isMatchError,
}: HomeScreenProps) {
  return (
    <main className="flex min-h-screen flex-col gap-10 bg-neutral-950 px-4 py-10 text-white">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <ThemeHero theme={theme} isRestricted={isRestricted} isError={isThemeError} />
        <div className="flex flex-col gap-4">
          <StatusPanel status={userStatus} />
          <SlotSummaryPanel
            summary={slotSummary}
            isRestricted={isRestricted}
            isError={isSlotError}
          />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <Highlights
          snapshotTop={snapshotTop}
          isRestricted={isRestricted}
          isError={isSnapshotError}
        />
      </section>
      <section className="flex flex-col gap-4">
        <MatchGrid matchFeed={matchFeed} isRestricted={isRestricted} isError={isMatchError} />
      </section>
    </main>
  );
}
