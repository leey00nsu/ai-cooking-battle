import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Skeleton as BaseSkeleton } from "@/shared/ui/shadcn/skeleton";

type SkeletonProps = React.ComponentProps<typeof BaseSkeleton>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <BaseSkeleton
      className={cn("rounded-[var(--radius-3xl)] bg-white/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
