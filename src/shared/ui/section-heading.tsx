import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type SectionHeadingProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

function SectionHeading({ title, description, icon, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <div className="flex items-center gap-2">
          {icon ? icon : null}
          <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-white/60">{description}</p> : null}
      </div>
      {action ? action : null}
    </div>
  );
}

export { SectionHeading };
