import type { AnalyticsEvent } from "@/shared/analytics/events";

type TrackPayload = Record<string, string | number | boolean | undefined | null>;

export function trackEvent(event: AnalyticsEvent, payload: TrackPayload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") {
    gtag("event", event, payload);
    return;
  }

  if (typeof window.dispatchEvent === "function") {
    const analyticsEvent = new CustomEvent("analytics", { detail: { event, payload } });
    window.dispatchEvent(analyticsEvent);
  }
}
