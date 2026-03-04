import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("trackEvent", () => {
  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterEach(() => {
    delete (window as Window & { gtag?: unknown }).gtag;
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("sends event when payload satisfies schema", () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: unknown }).gtag = gtag;

    trackEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "home",
      dayKey: "2026-03-04",
      dishId: "dish-1",
      rank: 1,
    });

    expect(gtag).toHaveBeenCalledWith("event", ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "home",
      dayKey: "2026-03-04",
      dishId: "dish-1",
      rank: 1,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("skips event when required payload key is missing", () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: unknown }).gtag = gtag;

    trackEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "home",
      dayKey: "2026-03-04",
    });

    expect(gtag).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[analytics.client] invalid payload", {
      event: ANALYTICS_EVENTS.RANKING_ITEM_CLICKED,
      payloadKeys: ["screen", "dayKey"],
      payloadSize: 2,
    });
  });

  it("skips untyped event when payload contains non-primitive value", () => {
    const gtag = vi.fn();
    (window as Window & { gtag?: unknown }).gtag = gtag;

    trackEvent(ANALYTICS_EVENTS.VIEW_HOME, {
      screen: "home",
      meta: { nested: true },
    } as unknown as Record<string, string | number | boolean | null | undefined>);

    expect(gtag).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[analytics.client] invalid payload", {
      event: ANALYTICS_EVENTS.VIEW_HOME,
      payloadKeys: ["screen", "meta"],
      payloadSize: 2,
    });
  });
});
