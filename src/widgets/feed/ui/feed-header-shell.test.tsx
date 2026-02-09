import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { FeedHeaderShell } from "./feed-header-shell";

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

describe("FeedHeaderShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filter links with expected query string", () => {
    render(
      <FeedHeaderShell
        filters={{
          mine: false,
          excludeBots: false,
          search: "",
          sort: "latest",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "All Dishes" })).toHaveAttribute("href", "/feed");
    expect(screen.getByRole("link", { name: "My Dishes" })).toHaveAttribute(
      "href",
      "/feed?mine=true",
    );
    expect(screen.getByRole("link", { name: "Exclude Bots" })).toHaveAttribute(
      "href",
      "/feed?excludeBots=true",
    );
  });

  it("preserves search/sort when toggling filters", () => {
    render(
      <FeedHeaderShell
        filters={{
          mine: true,
          excludeBots: true,
          search: "ramen",
          sort: "title_desc",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "All Dishes" })).toHaveAttribute(
      "href",
      "/feed?search=ramen&sort=title_desc",
    );
    expect(screen.getByRole("link", { name: "My Dishes" })).toHaveAttribute(
      "href",
      "/feed?excludeBots=true&search=ramen&sort=title_desc",
    );
    expect(screen.getByRole("link", { name: "Exclude Bots" })).toHaveAttribute(
      "href",
      "/feed?mine=true&search=ramen&sort=title_desc",
    );
  });

  it("renders guest mine warning message", () => {
    render(
      <FeedHeaderShell
        mineUnauthorized
        filters={{
          mine: true,
          excludeBots: false,
          search: "",
          sort: "latest",
        }}
      />,
    );

    expect(
      screen.getByText("Mine 필터는 로그인 후 사용할 수 있습니다. 현재 전체 요리를 표시합니다."),
    ).toBeInTheDocument();
  });

  it("renders search/sort controls with current filter values", () => {
    render(
      <FeedHeaderShell
        filters={{
          mine: true,
          excludeBots: true,
          search: "charcoal",
          sort: "oldest",
        }}
      />,
    );

    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    const sortSelect = screen.getByRole("combobox", { name: "Sort" });

    expect(searchInput).toHaveValue("charcoal");
    expect(sortSelect).toHaveValue("oldest");

    expect(
      screen.getByRole("link", {
        name: "Reset",
      }),
    ).toHaveAttribute("href", "/feed");
  });

  it("tracks FEED_FILTER_CHANGED when filter link is clicked", () => {
    render(
      <FeedHeaderShell
        filters={{
          mine: false,
          excludeBots: false,
          search: "",
          sort: "latest",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "My Dishes" }));

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.FEED_FILTER_CHANGED,
      expect.objectContaining({
        screen: "feed",
        source: "my_dishes",
        mine: true,
        excludeBots: false,
        dayKey: expect.any(String),
      }),
    );
  });

  it("tracks FEED_FILTER_CHANGED when apply is submitted", () => {
    render(
      <FeedHeaderShell
        filters={{
          mine: true,
          excludeBots: true,
          search: "steak",
          sort: "title_desc",
        }}
      />,
    );

    const form = screen.getByRole("searchbox", { name: "Search" }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.FEED_FILTER_CHANGED,
      expect.objectContaining({
        screen: "feed",
        source: "apply",
        mine: true,
        excludeBots: true,
        hasSearch: true,
        sort: "title_desc",
      }),
    );
  });
});
