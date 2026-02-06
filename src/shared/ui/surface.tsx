import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

const surfaceVariants = cva("border text-white", {
  variants: {
    tone: {
      card: "border-white/10 bg-card",
      cardMuted: "border-white/10 bg-card/80",
      soft: "border-white/10 bg-white/5",
      overlay: "border-white/10 bg-black/60",
      overlayMuted: "border-white/10 bg-black/55",
      overlayDanger: "border-red-500/40 bg-red-500/15",
      accent: "border-primary/45 bg-card",
      accentSoft: "border-primary/35 bg-card",
      avatar: "border-white/10 bg-black/40",
    },
    radius: {
      lg: "rounded-xl",
      xl: "rounded-2xl",
      "2xl": "rounded-[1.5rem]",
      "3xl": "rounded-[2rem]",
      full: "rounded-full",
    },
    shadow: {
      none: "",
      glowSm: "shadow-[0_0_20px_rgba(244,140,37,0.12)]",
      glowMd: "shadow-[0_0_24px_rgba(244,140,37,0.16)]",
      glowLg: "shadow-[0_0_36px_rgba(244,140,37,0.14)]",
    },
    stroke: {
      default: "",
      thickPrimary: "border-4 border-primary/30",
    },
    interactive: {
      none: "",
      border: "transition hover:border-primary/40",
      borderAndBackground: "transition hover:border-primary/45 hover:bg-white/10",
    },
  },
  defaultVariants: {
    tone: "card",
    radius: "xl",
    shadow: "none",
    stroke: "default",
    interactive: "none",
  },
});

type SurfaceProps = React.ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  };

function Surface({
  asChild = false,
  tone,
  radius,
  shadow,
  stroke,
  interactive,
  className,
  ...props
}: SurfaceProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(surfaceVariants({ tone, radius, shadow, stroke, interactive }), className)}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
