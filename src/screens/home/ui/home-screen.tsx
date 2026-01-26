import type { ReactNode } from "react";

type HomeScreenProps = {
  themeHero: ReactNode;
  statusPanel: ReactNode;
  slotSummary: ReactNode;
  highlights: ReactNode;
  matchGrid: ReactNode;
};

export default function HomeScreen({
  themeHero,
  statusPanel,
  slotSummary,
  highlights,
  matchGrid,
}: HomeScreenProps) {
  return (
    <main className="flex min-h-screen flex-col gap-10 bg-neutral-950 px-4 py-10 text-white">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {themeHero}
        <div className="flex flex-col gap-4">
          {statusPanel}
          {slotSummary}
        </div>
      </section>
      <section className="flex flex-col gap-4">{highlights}</section>
      <section className="flex flex-col gap-4">{matchGrid}</section>
    </main>
  );
}
