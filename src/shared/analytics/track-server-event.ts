import type { AnalyticsEvent } from "@/shared/analytics/events";

type ServerEventPayload = Record<string, string | number | boolean | null | undefined>;

export function trackServerEvent(event: AnalyticsEvent, payload: ServerEventPayload = {}) {
  console.info("[analytics.server]", {
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
}
