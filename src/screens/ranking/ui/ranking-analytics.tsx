"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

type RankingAnalyticsProps = {
  dayKey: string;
  status: "ready" | "empty" | "error" | "restricted";
  totalItems: number;
};

export default function RankingAnalytics({ dayKey, status, totalItems }: RankingAnalyticsProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }
    trackEvent(ANALYTICS_EVENTS.VIEW_RANKING, {
      screen: "ranking",
      dayKey,
      status,
      totalItems,
    });
    sentRef.current = true;
  }, [dayKey, status, totalItems]);

  return null;
}
