import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Input as BaseInput } from "@/shared/ui/shadcn/input";

const inputVariants = cva("", {
  variants: {
    variant: {
      default: "",
      ranking:
        "h-11 rounded-xl border-white/10 bg-background text-sm text-white placeholder:text-white/40 focus-visible:border-primary/60",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type InputProps = React.ComponentProps<typeof BaseInput> & VariantProps<typeof inputVariants>;

function Input({ className, variant = "default", ...props }: InputProps) {
  return <BaseInput className={cn(inputVariants({ variant }), className)} {...props} />;
}

export { Input, inputVariants };
