import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Textarea as BaseTextarea } from "@/shared/ui/shadcn/textarea";

type TextareaProps = React.ComponentProps<typeof BaseTextarea> & {
  intent?: "default" | "panel";
};

function Textarea({ className, intent = "default", ...props }: TextareaProps) {
  return (
    <BaseTextarea
      className={cn(
        intent === "panel"
          ? "min-h-[220px] rounded-2xl border border-dashed border-white/10 bg-background/40 text-base text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/40"
          : "",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
