import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import SnapshotAnalytics from "./snapshot-analytics";

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: vi.fn(),
}));

describe("SnapshotAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks snapshot entry event once with required payload", () => {
    const { rerender } = render(
      <SnapshotAnalytics dayKey="2026-02-12" status="ready" totalItems={10} />,
    );

    rerender(<SnapshotAnalytics dayKey="2026-02-12" status="ready" totalItems={10} />);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.VIEW_SNAPSHOT, {
      screen: "snapshot",
      dayKey: "2026-02-12",
      status: "ready",
      totalItems: 10,
    });
  });
});
