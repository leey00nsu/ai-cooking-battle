import { Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import type { MyKitchenDish } from "@/entities/kitchen/model/types";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { MediaDimmer } from "@/shared/ui/media-dimmer";
import { Pill } from "@/shared/ui/pill";
import { SectionHeading } from "@/shared/ui/section-heading";
import { Surface } from "@/shared/ui/surface";
import { formatCreatedAt } from "@/widgets/my-kitchen/model/format-created-at";

type RepresentativeSectionProps = {
  representative: MyKitchenDish | null;
  isClearingRepresentative: boolean;
  onClearRepresentative: () => void;
};

function RepresentativeSection({
  representative,
  isClearingRepresentative,
  onClearRepresentative,
}: RepresentativeSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title="Representative Dish"
        icon={<Sparkles aria-hidden className="h-5 w-5 text-primary" />}
      />

      {representative ? (
        <Surface asChild tone="accent" radius="3xl" shadow="glowLg" className="overflow-hidden">
          <article>
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative h-72 overflow-hidden sm:h-80 lg:col-span-7 lg:h-full">
                <img
                  alt={`Representative dish: ${representative.prompt}`}
                  className="h-full w-full object-cover"
                  src={representative.imageUrl}
                />
                <MediaDimmer tone="representative" />
                <Pill
                  style="solid"
                  size="label"
                  className="absolute left-4 top-4 gap-1 px-3 py-1.5"
                >
                  <Trophy aria-hidden className="h-3.5 w-3.5" />
                  Representative
                </Pill>
                <Pill
                  style="outline"
                  tone="neutral"
                  size="label"
                  className="absolute bottom-4 left-4 px-3 py-1 text-white/80"
                >
                  Created {formatCreatedAt(representative.createdAt)}
                </Pill>
              </div>

              <div className="flex flex-col justify-between gap-6 p-6 lg:col-span-5 lg:p-8">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Signature pick
                  </p>
                  <h3 className="text-3xl font-bold leading-tight text-white">
                    {representative.prompt}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/70">
                    대표작은 1개만 유지되며, 현재 상태를 기준으로 배틀 출전 여부가 저장됩니다.
                  </p>
                </div>

                <Surface tone="soft" radius="xl" className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
                    Today score
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <Surface
                      tone="card"
                      radius="full"
                      stroke="thickPrimary"
                      className="flex h-16 w-16 items-center justify-center"
                    >
                      <span className="text-xl font-black text-white">
                        {representative.dayScoreToday ?? "--"}
                      </span>
                    </Surface>
                  </div>
                </Surface>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="cta"
                    className="h-11"
                    disabled={isClearingRepresentative}
                    aria-busy={isClearingRepresentative}
                    onClick={onClearRepresentative}
                  >
                    Clear Representative
                  </Button>
                  <Button asChild variant="outline" className="h-11">
                    <Link
                      href={`/dishes/${representative.id}`}
                      aria-label={`${representative.prompt} 상세 페이지 보기`}
                    >
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </article>
        </Surface>
      ) : (
        <EmptyState
          title="대표작이 없습니다."
          description="아래 컬렉션에서 대표작을 선택하면 출전 상태를 켤 수 있습니다."
        />
      )}
    </section>
  );
}

export { RepresentativeSection };
