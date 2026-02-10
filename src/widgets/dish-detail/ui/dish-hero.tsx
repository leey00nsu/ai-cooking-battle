import type { DishDetail } from "@/entities/dish/model/types";
import { MediaDimmer } from "@/shared/ui/media-dimmer";
import { Pill } from "@/shared/ui/pill";
import { Surface } from "@/shared/ui/surface";

type DishHeroProps = {
  detail: DishDetail;
};

const createdAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }
  return createdAtFormatter.format(date);
}

function DishHero({ detail }: DishHeroProps) {
  const themeLabel = detail.theme.themeText?.trim() || "오늘의 주제";

  return (
    <Surface
      className="group relative min-h-[420px] overflow-hidden p-6 md:min-h-[560px] md:p-8"
      radius="3xl"
      tone="card"
      shadow="glowSm"
    >
      <img
        alt={`${detail.dish.dishName} 요리 이미지`}
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="eager"
        src={detail.dish.imageUrl}
      />
      <MediaDimmer
        tone="card"
        className="bg-gradient-to-t from-black/90 via-black/50 to-black/25"
      />

      <div className="relative flex h-full flex-col justify-between">
        <div>
          <Pill size="xs" style="outline" tone="amber">
            {themeLabel}
          </Pill>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/70">{detail.author.displayName}</p>
          <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
            {detail.dish.dishName}
          </h1>
          <p className="text-sm text-white/65">{formatCreatedAt(detail.dish.createdAt)}</p>
        </div>
      </div>
    </Surface>
  );
}

export { DishHero };
