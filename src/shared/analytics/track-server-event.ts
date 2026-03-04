import type { AnalyticsEvent } from "@/shared/analytics/events";
import { validateAnalyticsPayload } from "@/shared/analytics/validate-payload";

type ServerEventPayload = Record<string, string | number | boolean | null | undefined>;

export function trackServerEvent(event: AnalyticsEvent, payload: ServerEventPayload = {}) {
  if (!validateAnalyticsPayload(event, payload)) {
    const payloadKeys = Object.keys(payload);
    console.warn("[analytics.server] invalid payload", {
      event,
      payloadKeys,
      payloadSize: payloadKeys.length,
    });
    return;
  }

  console.info("[analytics.server]", {
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
}
