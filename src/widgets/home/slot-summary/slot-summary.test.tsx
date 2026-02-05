import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SlotSummaryPanel from "./slot-summary";

describe("SlotSummaryPanel", () => {
  it("renders Ad Bonus card even when ads are disabled", () => {
    render(
      <SlotSummaryPanel
        summary={{
          freeLimit: 1,
          freeUsedCount: 0,
          adLimit: 10,
          adUsedCount: 0,
          freeDailyLimit: 1,
          activeFreeReservationCount: 0,
          canUseFreeSlotToday: true,
        }}
      />,
    );

    expect(screen.getByText("Free Slots")).toBeInTheDocument();
    expect(screen.getByText("Ad Bonus")).toBeInTheDocument();
    expect(screen.getByText("준비중")).toBeInTheDocument();
  });
});
