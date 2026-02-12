import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import RankingAnalytics from "./ranking-analytics";

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: vi.fn(),
}));

describe("RankingAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks ranking entry event once with required payload", () => {
    const { rerender } = render(
      <RankingAnalytics dayKey="2026-02-12" status="ready" totalItems={10} />,
    );

    rerender(<RankingAnalytics dayKey="2026-02-12" status="ready" totalItems={10} />);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.VIEW_RANKING, {
      screen: "ranking",
      dayKey: "2026-02-12",
      status: "ready",
      totalItems: 10,
    });
  });
});
