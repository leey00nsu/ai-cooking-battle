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
      payload: {
        screen: "home",
        dayKey: "2026-03-04",
      },
    });
  });
});
