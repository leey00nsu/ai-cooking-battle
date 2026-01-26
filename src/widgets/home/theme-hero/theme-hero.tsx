import type { Theme } from "@/entities/theme/model/types";

type ThemeHeroProps = {
  theme: Theme | null;
};

export default function ThemeHero({ theme }: ThemeHeroProps) {
  const title = theme?.themeText ?? "오늘의 주제";
  const dayKey = theme?.dayKey ?? "----";

  return (
    <section className="flex min-h-[280px] flex-col justify-end rounded-3xl bg-neutral-900 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
        Today&apos;s Theme
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-neutral-400">{dayKey}</p>
    </section>
  );
}
