"use client";

import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

type StartCreateButtonProps = {
  href: string;
  userType: "guest" | "auth";
  isEligible: boolean;
  dayKey?: string | null;
};

export default function StartCreateButton({
  href,
  userType,
  isEligible,
  dayKey,
}: StartCreateButtonProps) {
  const handleClick = () => {
    trackEvent(ANALYTICS_EVENTS.START_CREATE, {
      dayKey: dayKey ?? undefined,
      isEligible,
      userType,
      screen: "home",
    });
  };

  return (
    <Link
      className="inline-flex items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-amber-300"
      href={href}
      onClick={handleClick}
    >
      Start Creating
    </Link>
  );
}
