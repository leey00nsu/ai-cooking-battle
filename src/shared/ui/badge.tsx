import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Badge as BaseBadge } from "@/shared/ui/shadcn/badge";

const badgeVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      default:
        "rounded-[var(--radius-4xl)] px-3 py-1 text-[11px] font-semibold tracking-wide",
      icon: "rounded-full bg-white/5 p-2 text-amber-300",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = Omit<React.ComponentProps<typeof BaseBadge>, "variant"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <BaseBadge className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
