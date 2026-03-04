import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackServerEvent } from "@/shared/analytics/track-server-event";

const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("trackServerEvent", () => {
  beforeEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
  });

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("logs event when payload satisfies schema", () => {
    trackServerEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "ranking",
      dayKey: "2026-03-04",
      dishId: "dish-10",
      source: "archive",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "[analytics.server]",
      expect.objectContaining({
        event: ANALYTICS_EVENTS.RANKING_ITEM_CLICKED,
        payload: {
          screen: "ranking",
          dayKey: "2026-03-04",
          dishId: "dish-10",
          source: "archive",
        },
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("skips event when required payload key is missing", () => {
    trackServerEvent(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "ranking",
      dayKey: "2026-03-04",
    });

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[analytics.server] invalid payload", {
      event: ANALYTICS_EVENTS.RANKING_ITEM_CLICKED,
      payloadKeys: ["screen", "dayKey"],
      payloadSize: 2,
    });
  });

  it("skips untyped event when payload contains non-primitive value", () => {
    trackServerEvent(ANALYTICS_EVENTS.VIEW_HOME, {
      screen: "ranking",
      meta: { nested: true },
    } as unknown as Record<string, string | number | boolean | null | undefined>);

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[analytics.server] invalid payload", {
      event: ANALYTICS_EVENTS.VIEW_HOME,
      payloadKeys: ["screen", "meta"],
      payloadSize: 2,
    });
  });
});
