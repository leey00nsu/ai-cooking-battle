import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

export default function SnapshotLoading() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <Surface className="p-6 md:p-8" radius="3xl" tone="card">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-4 h-9 w-2/3" />
          <Skeleton className="mt-3 h-5 w-1/3" />
        </Surface>

        <Surface className="overflow-hidden p-0" radius="3xl" tone="cardMuted">
          <Skeleton className="h-64 w-full rounded-none md:h-80" />
        </Surface>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 10 }, (_, index) => (
            <Surface
              key={`snapshot-loading-card-${index + 1}`}
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
      </main>
    </div>
  );
}
