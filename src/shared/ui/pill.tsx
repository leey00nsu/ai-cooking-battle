import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

const pillVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-[var(--radius-4xl)] px-3 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "",
        primary: "",
        amber: "",
        success: "",
        danger: "",
      },
      style: {
        soft: "",
        outline: "border border-white/10 bg-black/40",
        solid: "bg-primary text-primary-foreground",
        ghost: "bg-transparent",
      },
      size: {
        label: "px-3 py-1 text-[11px] font-bold tracking-[0.12em]",
        xs: "px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
        sm: "px-3 py-1 text-xs font-semibold",
        md: "px-3 py-1.5 text-sm font-semibold",
      },
    },
    compoundVariants: [
      { style: "soft", tone: "neutral", className: "bg-white/10 text-white/90" },
      { style: "soft", tone: "primary", className: "bg-primary/20 text-primary" },
      { style: "soft", tone: "amber", className: "bg-primary/20 text-primary" },
      { style: "soft", tone: "success", className: "bg-emerald-500/20 text-emerald-200" },
      { style: "soft", tone: "danger", className: "bg-rose-500/20 text-rose-200" },
      { style: "outline", tone: "neutral", className: "text-white/80" },
      { style: "outline", tone: "amber", className: "border-primary/30 text-primary" },
    ],
    defaultVariants: {
      tone: "neutral",
      style: "soft",
      size: "sm",
    },
  },
);

type PillProps = Omit<React.ComponentProps<typeof Badge>, "variant"> &
  VariantProps<typeof pillVariants>;

function Pill({ className, tone, style, size, ...props }: PillProps) {
  return (
    <Badge className={cn(pillVariants({ tone, style, size }), className)} {...props} />
  );
}

export { Pill, pillVariants };
