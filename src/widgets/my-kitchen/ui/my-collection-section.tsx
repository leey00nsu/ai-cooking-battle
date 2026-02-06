import { Flame, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import type { MyKitchenDish } from "@/entities/kitchen/model/types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { MediaDimmer } from "@/shared/ui/media-dimmer";
import { Pill } from "@/shared/ui/pill";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";
import {
  COLLECTION_FILTERS,
  type CollectionFilter,
} from "@/widgets/my-kitchen/model/collection-filter";
import { formatCreatedAt } from "@/widgets/my-kitchen/model/format-created-at";

type MyCollectionSectionProps = {
  dishes: MyKitchenDish[];
  filteredDishes: MyKitchenDish[];
  filter: CollectionFilter;
  representativeDishId: string | null;
  isSettingRepresentative: boolean;
  onSetFilter: (next: CollectionFilter) => void;
  onSetRepresentative: (dishId: string) => void;
};

function MyCollectionSection({
  dishes,
  filteredDishes,
  filter,
  representativeDishId,
  isSettingRepresentative,
  onSetFilter,
  onSetRepresentative,
}: MyCollectionSectionProps) {
  if (dishes.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeading title="My Collection" />
        <EmptyState
          title="아직 만든 요리가 없습니다."
          description="Create 페이지에서 첫 요리를 만들어 보세요."
          action={
            <Button asChild variant="cta" className="h-11 px-6">
              <Link href="/create">Create로 이동</Link>
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <SectionHeading
        title="My Collection"
        description="카드를 선택해 대표작으로 지정하거나 상세 정보를 확인하세요."
        action={
          <Button asChild variant="cta" className="h-11 px-6">
            <Link href="/create">Create New</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {COLLECTION_FILTERS.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={filter === option.key ? "cta" : "outline"}
            size="sm"
            className="h-8 px-3 text-xs font-semibold"
            onClick={() => onSetFilter(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {filteredDishes.length === 0 ? (
        <EmptyState
          title="필터 조건에 맞는 요리가 없습니다."
          description="다른 필터를 선택해 주세요."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDishes.map((dish) => {
            const isRepresentative = representativeDishId === dish.id;
            return (
              <li key={dish.id}>
                <MyCollectionCard
                  dish={dish}
                  isRepresentative={isRepresentative}
                  isSettingRepresentative={isSettingRepresentative}
                  onSetRepresentative={onSetRepresentative}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type MyCollectionCardProps = {
  dish: MyKitchenDish;
  isRepresentative: boolean;
  isSettingRepresentative: boolean;
  onSetRepresentative: (dishId: string) => void;
};

function MyCollectionCard({
  dish,
  isRepresentative,
  isSettingRepresentative,
  onSetRepresentative,
}: MyCollectionCardProps) {
  return (
    <Surface
      asChild
      tone={isRepresentative ? "accent" : "card"}
      radius="2xl"
      shadow={isRepresentative ? "glowMd" : "none"}
      interactive={isRepresentative ? "none" : "border"}
      className="group overflow-hidden"
    >
      <article>
        <div className="relative h-48 overflow-hidden">
          <img
            alt={`Dish image: ${dish.prompt}`}
            className={cn("h-full w-full object-cover", dish.isHidden ? "grayscale" : "")}
            src={dish.imageUrl}
          />
          <MediaDimmer tone="card" visibility="hover" />

          {isRepresentative ? (
            <Pill
              style="outline"
              tone="neutral"
              size="xs"
              className="absolute left-3 top-3 gap-1 text-white/80"
            >
              <Star aria-hidden className="h-3 w-3 text-primary" />
              Representative
            </Pill>
          ) : null}

          {dish.isHidden ? (
            <Pill
              style="soft"
              tone="danger"
              size="xs"
              className="absolute right-3 top-3 gap-1 text-red-100"
            >
              <ShieldAlert aria-hidden className="h-3 w-3" />
              Hidden
            </Pill>
          ) : (
            <Pill
              style="outline"
              tone="neutral"
              size="xs"
              className="absolute right-3 top-3 gap-1 text-white"
            >
              <Flame aria-hidden className="h-3.5 w-3.5 text-primary" />
              {dish.dayScoreToday ?? "--"}
            </Pill>
          )}

          <div className="absolute inset-x-3 bottom-3 z-20 flex flex-col gap-2 md:translate-y-2 md:opacity-0 md:transition md:group-hover:translate-y-0 md:group-hover:opacity-100">
            {!isRepresentative ? (
              <Button
                type="button"
                variant="cta"
                className="h-10 px-4 text-xs font-bold uppercase tracking-[0.08em]"
                aria-label={`${dish.prompt}을 대표작으로 설정`}
                disabled={isSettingRepresentative}
                aria-busy={isSettingRepresentative}
                onClick={() => onSetRepresentative(dish.id)}
              >
                Set as Representative
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="h-10 px-4 text-xs font-bold uppercase tracking-[0.08em]"
            >
              <Link href={`/dishes/${dish.id}`} aria-label={`${dish.prompt} 상세 페이지 보기`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <h3 className="truncate text-lg font-bold text-white">{dish.prompt}</h3>
          <div className="flex items-center justify-between text-xs text-white/65">
            <span>Created {formatCreatedAt(dish.createdAt)}</span>
            <span
              className={cn("font-semibold", dish.isHidden ? "text-red-300" : "text-green-300")}
            >
              {dish.isHidden ? "Hidden from battle" : "Battle ready"}
            </span>
          </div>
        </div>
      </article>
    </Surface>
  );
}

export { MyCollectionSection };
