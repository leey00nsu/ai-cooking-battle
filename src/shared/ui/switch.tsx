import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Switch as BaseSwitch } from "@/shared/ui/shadcn/switch";

type SwitchProps = React.ComponentProps<typeof BaseSwitch>;

function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch
      className={cn(
        "h-7 w-12 data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/20 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-6",
        className,
      )}
      {...props}
    />
  );
}

export { Switch };
