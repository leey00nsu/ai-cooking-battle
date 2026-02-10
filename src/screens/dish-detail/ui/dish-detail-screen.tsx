import type { DishDetail } from "@/entities/dish/model/types";
import { DishAnalysisPanel } from "@/widgets/dish-detail/ui/dish-analysis-panel";
import {
  DishDetailErrorState,
  DishDetailNotFoundState,
  DishDetailRestrictedState,
} from "@/widgets/dish-detail/ui/dish-detail-fetch-states";
import { DishHero } from "@/widgets/dish-detail/ui/dish-hero";

type DishDetailScreenProps =
  | {
      status: "ready" | "pending";
      detail: DishDetail;
    }
  | {
      status: "error" | "notFound" | "restricted";
      detail?: undefined;
    };

export default function DishDetailScreen(props: DishDetailScreenProps) {
  const isReadyState = props.status === "ready" || props.status === "pending";
  if (!isReadyState) {
    return (
      <div className="bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
          {props.status === "notFound" ? (
            <DishDetailNotFoundState />
          ) : props.status === "restricted" ? (
            <DishDetailRestrictedState />
          ) : (
            <DishDetailErrorState />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <DishHero detail={props.detail} />
          <DishAnalysisPanel detail={props.detail} />
        </div>
      </main>
    </div>
  );
}
