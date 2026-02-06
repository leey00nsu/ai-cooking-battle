import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Textarea as BaseTextarea } from "@/shared/ui/shadcn/textarea";

const textareaVariants = cva("", {
  variants: {
    variant: {
      default: "",
      panel:
        "min-h-[220px] rounded-2xl border border-dashed border-white/10 bg-background/40 text-base text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/40",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type TextareaProps = React.ComponentProps<typeof BaseTextarea> &
  VariantProps<typeof textareaVariants>;

function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return <BaseTextarea className={cn(textareaVariants({ variant }), className)} {...props} />;
}

export { Textarea, textareaVariants };
