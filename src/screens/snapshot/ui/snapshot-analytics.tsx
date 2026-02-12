"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

type SnapshotAnalyticsProps = {
  dayKey: string;
  status: "ready" | "empty" | "error" | "restricted";
  totalItems: number;
};

export default function SnapshotAnalytics({ dayKey, status, totalItems }: SnapshotAnalyticsProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }
    trackEvent(ANALYTICS_EVENTS.VIEW_SNAPSHOT, {
      screen: "snapshot",
      dayKey,
      status,
      totalItems,
    });
    sentRef.current = true;
  }, [dayKey, status, totalItems]);

  return null;
}
