import type { MatchFeed } from "@/entities/match/model/types";
import type { SnapshotTop } from "@/entities/snapshot/model/types";
import type { SlotSummary } from "@/entities/slot/model/types";
import type { Theme } from "@/entities/theme/model/types";
import StartCreateButton from "@/features/start-create-cta/start-create-button";
import HomeAnalytics from "@/screens/home/ui/home-analytics";
import Highlights from "@/widgets/home/highlights/highlights";
import MatchGrid from "@/widgets/home/match-grid/match-grid";
import HomeNavigation from "@/widgets/home/home-navigation/home-navigation";
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
  const userType = userStatus === "GUEST" ? "guest" : "auth";
  const isEligible = userStatus === "ELIGIBLE";
  const ctaHref =
    userStatus === "LIMITED" ? "/restricted" : userType === "guest" ? "/start" : "/create";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <HomeNavigation userType={userType} active="home" />
      <main className="flex flex-col items-center px-4 pb-10 pt-24 md:px-8">
        <HomeAnalytics dayKey={theme?.dayKey} isEligible={isEligible} userType={userType} />
        <div className="flex w-full max-w-[1200px] flex-col gap-12">
          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <ThemeHero
              theme={theme}
              isRestricted={isRestricted}
              isError={isThemeError}
              cta={
                <StartCreateButton
                  href={ctaHref}
                  userType={userType}
                  isEligible={isEligible}
                  dayKey={theme?.dayKey}
                />
              }
            />
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
            <MatchGrid
              matchFeed={matchFeed}
              isRestricted={isRestricted}
              isError={isMatchError}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
