import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

type MyKitchenErrorStateProps = {
  onRetry: () => void;
};

function MyKitchenLoadingState() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="space-y-3">
            <Skeleton className="h-12 w-72 max-w-full" />
            <Skeleton className="h-5 w-[34rem] max-w-full" />
          </div>
          <div className="w-[220px] space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-16" />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Surface tone="card" radius="3xl" className="overflow-hidden p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <Skeleton className="h-64 lg:col-span-7" />
              <div className="space-y-4 lg:col-span-5">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-11" />
              </div>
            </div>
          </Surface>

          <Surface asChild tone="cardMuted" radius="2xl" className="p-5">
            <aside>
              <Skeleton className="h-7 w-40" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={`recent-loading-${index + 1}`} className="h-16" />
                ))}
              </div>
            </aside>
          </Surface>
        </div>
      </main>
    </div>
  );
}

function MyKitchenErrorState({ onRetry }: MyKitchenErrorStateProps) {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <ErrorState
          title="내 요리를 불러올 수 없습니다."
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button type="button" variant="outline" className="h-10 px-6" onClick={onRetry}>
              다시 시도
            </Button>
          }
        />
      </main>
    </div>
  );
}

export { MyKitchenErrorState, MyKitchenLoadingState };
