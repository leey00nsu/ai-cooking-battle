"use client";

import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import type { ReactNode } from "react";

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

  const baseClassName =
    "inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-amber-300";

  return (
    <Link
      className={`${baseClassName} ${className ?? ""}`.trim()}
      href={href}
      onClick={handleClick}
    >
      {children ?? "Start Creating"}
    </Link>
  );
}
