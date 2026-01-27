"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

type HomeAnalyticsProps = {
  dayKey?: string | null;
  isEligible: boolean;
  userType: "guest" | "auth";
};

export default function HomeAnalytics({ dayKey, isEligible, userType }: HomeAnalyticsProps) {
  const sentAnalyticsRef = useRef(false);

  useEffect(() => {
    if (sentAnalyticsRef.current) {
      return;
    }

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
    sentAnalyticsRef.current = true;
  }, [dayKey, isEligible, userType]);

  return null;
}
