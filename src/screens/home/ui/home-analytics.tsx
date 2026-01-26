"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

type HomeAnalyticsProps = {
  dayKey?: string | null;
  isEligible: boolean;
  userType: "guest" | "auth";
};

export default function HomeAnalytics({ dayKey, isEligible, userType }: HomeAnalyticsProps) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.VIEW_HOME, {
      dayKey: dayKey ?? undefined,
      isEligible,
      userType,
      screen: "home",
    });
    if (dayKey) {
      trackEvent(ANALYTICS_EVENTS.VIEW_THEME, {
        dayKey,
        isEligible,
        userType,
        screen: "home",
      });
    }
  }, [dayKey, isEligible, userType]);

  return null;
}
