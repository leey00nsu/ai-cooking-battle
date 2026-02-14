import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

export default function RankingLoading() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6 px-4 pb-16 pt-24 md:px-8">
        <Surface className="space-y-4 p-5" radius="2xl" tone="cardMuted">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </Surface>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-9">
            <Surface className="space-y-3 p-6" radius="2xl" tone="cardMuted">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-3/4" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Surface>

            <Surface className="overflow-hidden p-0" radius="3xl" tone="cardMuted">
              <Skeleton className="h-[360px] w-full rounded-none md:h-[460px]" />
            </Surface>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Surface
                  key={`ranking-loading-card-${index + 1}`}
                  className="space-y-3 p-4"
                  radius="2xl"
                  tone="cardMuted"
                >
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </Surface>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <Surface className="space-y-4 p-5" radius="2xl" tone="cardMuted">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Surface>
          </div>
        </div>
      </main>
    </div>
  );
}
