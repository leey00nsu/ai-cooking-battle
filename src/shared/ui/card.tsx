import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";
import {
  Card as BaseCard,
  CardAction as BaseCardAction,
  CardContent as BaseCardContent,
  CardDescription as BaseCardDescription,
  CardFooter as BaseCardFooter,
  CardHeader as BaseCardHeader,
  CardTitle as BaseCardTitle,
} from "@/shared/ui/shadcn/card";

const cardVariants = cva("rounded-[var(--radius-4xl)] border text-white", {
  variants: {
    tone: {
      default: "border-white/10 bg-card/90",
      solid: "border-white/5 bg-card",
      accent: "border-primary/30 bg-card/90",
      ghost: "border-transparent bg-card/90",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

type CardProps = React.ComponentProps<typeof BaseCard>;
type CardHeaderProps = React.ComponentProps<typeof BaseCardHeader>;
type CardTitleProps = React.ComponentProps<typeof BaseCardTitle>;
type CardDescriptionProps = React.ComponentProps<typeof BaseCardDescription>;
type CardActionProps = React.ComponentProps<typeof BaseCardAction>;
type CardContentProps = React.ComponentProps<typeof BaseCardContent>;
type CardFooterProps = React.ComponentProps<typeof BaseCardFooter>;

type CardRootProps = CardProps & VariantProps<typeof cardVariants>;

function Card({ className, tone, ...props }: CardRootProps) {
  return (
    <BaseCard
      className={cn(cardVariants({ tone }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return <BaseCardHeader className={cn("px-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: CardTitleProps) {
  return <BaseCardTitle className={cn("text-white", className)} {...props} />;
}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <BaseCardDescription className={cn("text-white/70", className)} {...props} />;
}

function CardAction({ className, ...props }: CardActionProps) {
  return <BaseCardAction className={className} {...props} />;
}

function CardContent({ className, ...props }: CardContentProps) {
  return <BaseCardContent className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: CardFooterProps) {
  return <BaseCardFooter className={cn("px-6", className)} {...props} />;
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
  cardVariants,
};
