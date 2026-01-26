import type { Theme } from "@/entities/theme/model/types";

type ThemeHeroProps = {
  theme: Theme | null;
};

export default function ThemeHero({ theme }: ThemeHeroProps) {
  const title = theme?.themeText ?? "오늘의 주제";
  const dayKey = theme?.dayKey ?? "----";
  const backgroundUrl = theme?.themeImageUrl ?? "";

  return (
    <section
      className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 bg-cover bg-center p-6"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      {!backgroundUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-neutral-900 to-neutral-950" />
      ) : null}
      <div className="relative flex flex-col gap-2">
        <span className="inline-flex w-fit items-center rounded-full border border-amber-400/40 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          Today&apos;s Theme
        </span>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
        <p className="text-sm text-neutral-300">{dayKey}</p>
      </div>
    </section>
  );
}
