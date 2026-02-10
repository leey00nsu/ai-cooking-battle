import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { FeedSpotlightShell } from "./feed-spotlight-shell";

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

describe("FeedSpotlightShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks FEED_ITEM_CLICKED when spotlight link is clicked", () => {
    render(
      <FeedSpotlightShell
        item={{
          id: "dish-spotlight-1",
          prompt: "Spotlight Dish",
          imageUrl: "https://example.com/spotlight.jpg",
          createdAt: "2026-02-10T10:00:00.000Z",
          authorType: "bot",
          authorLabel: "AI Chef",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: /Spotlight Dish detail page/i }));

    expect(screen.getByAltText("Spotlight dish image: Spotlight Dish")).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.FEED_ITEM_CLICKED,
      expect.objectContaining({
        screen: "feed",
        section: "spotlight",
        dishId: "dish-spotlight-1",
        authorType: "bot",
        dayKey: expect.any(String),
      }),
    );
  });
});
