import { ANALYTICS_EVENT_PAYLOAD_SCHEMA, type AnalyticsEvent } from "@/shared/analytics/events";

type AnalyticsPayloadValue = string | number | boolean;

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.hasOwn(payload, key);
}

function isPayloadValue(value: unknown): value is AnalyticsPayloadValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function validateAnalyticsPayload(
  event: AnalyticsEvent,
  payload: Record<string, unknown>,
): payload is Record<string, AnalyticsPayloadValue> {
  const schema = ANALYTICS_EVENT_PAYLOAD_SCHEMA[event];
  if (!schema) {
    return true;
  }

  for (const key of schema.required) {
    if (!hasOwn(payload, key) || !isPayloadValue(payload[key])) {
      return false;
    }
  }

  for (const key of schema.optional) {
    if (hasOwn(payload, key) && !isPayloadValue(payload[key])) {
      return false;
    }
  }

  return true;
}
