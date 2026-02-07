import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Button as BaseButton } from "@/shared/ui/shadcn/button";

const buttonVariants = cva(
  "cursor-pointer rounded-[var(--radius-4xl)] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
        secondary: "",
        link: "",
        outline: "border border-white/10 bg-transparent text-white hover:bg-white/10",
        ghost: "bg-transparent text-white hover:bg-white/10",
        cta: "bg-primary text-primary-foreground shadow-[var(--shadow-glow-md)] hover:bg-primary/90",
        nav: "bg-primary text-primary-foreground shadow-[var(--shadow-glow-sm)] hover:bg-primary/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AppButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

const variantToBaseVariantMap: Record<
  AppButtonVariant,
  NonNullable<React.ComponentProps<typeof BaseButton>["variant"]>
> = {
  default: "default",
  destructive: "destructive",
  secondary: "secondary",
  link: "link",
  outline: "outline",
  ghost: "ghost",
  cta: "default",
  nav: "default",
};

type ButtonProps = Omit<React.ComponentProps<typeof BaseButton>, "variant"> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant = "default", ...props }: ButtonProps) {
  const resolvedVariant = variantToBaseVariantMap[variant ?? "default"];

  return (
    <BaseButton
      className={cn(buttonVariants({ variant }), className)}
      variant={resolvedVariant}
      {...props}
    />
  );
}

export { Button, buttonVariants };
