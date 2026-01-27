import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import { Button as BaseButton } from "@/shared/ui/shadcn/button";

const buttonIntentVariants = cva(
  "rounded-[var(--radius-4xl)] font-semibold transition-colors",
  {
    variants: {
      intent: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        cta: "bg-primary text-primary-foreground shadow-[var(--shadow-glow-md)] hover:bg-primary/90",
        nav: "bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90",
        outline: "border border-white/10 bg-transparent text-white hover:bg-white/10",
        ghost: "bg-transparent text-white hover:bg-white/10",
      },
    },
    defaultVariants: {
      intent: "primary",
    },
  },
);

type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonIntentVariants>;

function Button({ className, intent, variant, ...props }: ButtonProps) {
  const resolvedVariant =
    intent === "outline" ? "outline" : intent === "ghost" ? "ghost" : variant;

  return (
    <BaseButton
      className={cn(buttonIntentVariants({ intent }), className)}
      variant={resolvedVariant}
      {...props}
    />
  );
}

export { Button, buttonIntentVariants };
