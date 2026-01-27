import type { ReactNode } from "react";
import type { Theme } from "@/entities/theme/model/types";

type ThemeHeroProps = {
  theme: Theme | null;
  isRestricted?: boolean;
  isError?: boolean;
  cta?: ReactNode;
};

export default function ThemeHero({ theme, isRestricted, isError, cta }: ThemeHeroProps) {
  const title = theme?.themeText ?? "오늘의 주제";
  const dayKey = theme?.dayKey ?? "----";
  const backgroundUrl = theme?.themeImageUrl ?? "";
  const tintClass = isRestricted ? "bg-amber-500/20" : isError ? "bg-rose-500/20" : "";

  return (
    <section
      className="relative flex min-h-[400px] flex-col justify-end overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-900 bg-cover bg-center p-8 shadow-2xl shadow-black/50 lg:min-h-[500px] lg:p-10"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      {tintClass ? <div className={`absolute inset-0 ${tintClass}`} /> : null}
      {!backgroundUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-neutral-900 to-neutral-950" />
      ) : null}
      <div className="relative flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/40 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
          Today&apos;s Theme
        </span>
        <h1 className="text-4xl font-black leading-tight tracking-[-0.03em] text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="text-sm text-neutral-300">{dayKey}</p>
        {cta ? <div className="mt-4">{cta}</div> : null}
      </div>
    </section>
  );
}
