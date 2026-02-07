"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

type StartCreateButtonProps = {
  href: string;
  userType: "guest" | "auth";
  isEligible: boolean;
  dayKey?: string | null;
  className?: string;
  children?: ReactNode;
};

export default function StartCreateButton({
  href,
  userType,
  isEligible,
  dayKey,
  className,
  children,
}: StartCreateButtonProps) {
  const handleClick = () => {
    trackEvent(ANALYTICS_EVENTS.START_CREATE, {
      dayKey: dayKey ?? undefined,
      isEligible,
      userType,
      screen: "home",
    });
  };

  const baseClassName = "w-full justify-between";

  return (
    <Button asChild className={cn(baseClassName, className)} variant="cta">
      <Link href={href} onClick={handleClick}>
        {children ?? "Start Creating"}
      </Link>
    </Button>
  );
}
