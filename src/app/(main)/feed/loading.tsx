import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

export default function Loading() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <div className="space-y-5">
          <Skeleton className="h-10 w-48" />
          <Surface className="flex flex-wrap items-center gap-2 p-3" radius="2xl" tone="soft">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </Surface>
          <Surface className="p-3" radius="2xl" tone="soft">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Surface>
        </div>

        <Surface className="p-6 md:p-8" radius="3xl" tone="card">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-3 h-10 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <Skeleton className="mt-5 h-10 w-28" />
        </Surface>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Surface
              key={`feed-loading-card-${index + 1}`}
              className="overflow-hidden p-0"
              radius="2xl"
              tone="cardMuted"
            >
              <Skeleton className="h-44 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Surface>
          ))}
        </div>
      </main>
    </div>
  );
}
