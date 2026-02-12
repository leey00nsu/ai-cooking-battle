import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { RankingChampion } from "./ranking-champion";

vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...props }: Record<string, unknown>) => (
    <a
      href={typeof href === "string" ? href : ""}
      onClick={(event) => {
        event.preventDefault();
        if (typeof onClick === "function") {
          onClick(event);
        }
      }}
      {...props}
    >
      {children as ReactNode}
    </a>
  ),
}));

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: vi.fn(),
}));

describe("RankingChampion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks champion click with rank payload", () => {
    render(
      <RankingChampion
        dayKey="2026-02-12"
        entry={{
          rank: 1,
          dishId: "dish-1",
          dishName: "Champion Dish",
          authorName: "Chef_01",
          imageUrl: "https://example.com/champion.jpg",
          score: 9.9,
          leftImageUrl: "https://example.com/left.jpg",
          rightImageUrl: "https://example.com/right.jpg",
          leftScore: 9.9,
          rightScore: 9.6,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "View Analysis" }));

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.RANKING_ITEM_CLICKED,
      expect.objectContaining({
        screen: "ranking",
        section: "champion",
        dayKey: "2026-02-12",
        rank: 1,
        dishId: "dish-1",
      }),
    );
  });
});
