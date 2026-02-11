import { Skeleton } from "@/shared/ui/skeleton";
import { Surface } from "@/shared/ui/surface";

export default function Loading() {
  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-24 md:px-8">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Surface className="relative overflow-hidden p-6 md:p-8" radius="3xl" tone="card">
            <Skeleton className="h-[420px] w-full md:h-[560px]" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-72 max-w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </Surface>

          <Surface className="p-6 md:p-8" radius="3xl" tone="card">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-6 h-52 w-full" />
            <Skeleton className="mt-6 h-36 w-full" />
            <Skeleton className="mt-6 h-24 w-full" />
          </Surface>
        </div>
      </main>
    </div>
  );
}
