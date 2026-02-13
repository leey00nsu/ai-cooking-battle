import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Calendar as BaseCalendar } from "@/shared/ui/shadcn/calendar";

type CalendarProps = React.ComponentProps<typeof BaseCalendar>;

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <BaseCalendar
      className={cn(
        "rounded-xl border border-white/10 bg-background text-white [&_.rdp-day_button]:text-white",
        className,
      )}
      {...props}
    />
  );
}

export { Calendar };
