import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { RecentDishesShell } from "./recent-dishes-shell";

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

describe("RecentDishesShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks FEED_ITEM_CLICKED when recent dish link is clicked", () => {
    render(
      <RecentDishesShell
        items={[
          {
            id: "dish-recent-1",
            prompt: "Recent Dish",
            imageUrl: "https://example.com/recent.jpg",
            createdAt: "2026-02-10T10:30:00.000Z",
            authorType: "user",
            authorLabel: "Chef A",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: /Recent Dish detail page/i }));

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.FEED_ITEM_CLICKED,
      expect.objectContaining({
        screen: "feed",
        section: "recent",
        dishId: "dish-recent-1",
        authorType: "user",
        dayKey: expect.any(String),
      }),
    );
  });
});
