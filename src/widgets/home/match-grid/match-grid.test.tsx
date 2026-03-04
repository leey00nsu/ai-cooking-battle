import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import MatchGrid from "./match-grid";

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: trackEventMock,
}));

const matchFeed = {
  items: [
    {
      id: "match-1",
      dayKey: "2026-01-26",
      leftDishImageUrl: "https://example.com/left.jpg",
      rightDishImageUrl: "https://example.com/right.jpg",
      leftScore: 9.6,
      rightScore: 8.2,
      isPractice: true,
    },
  ],
};

describe("MatchGrid", () => {
  it("renders match cards with practice label", () => {
    render(<MatchGrid matchFeed={matchFeed} />);

    expect(screen.getByText(/랭킹 하이라이트 1개/)).toBeInTheDocument();
    expect(screen.getByText("연습전")).toBeInTheDocument();
    expect(screen.getByText("Top Score 9.6")).toBeInTheDocument();
    expect(screen.queryByText(/vs/i)).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "View Feed" })).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/ranking/2026-01-26")).toBe(true);
  });

  it("renders empty state when no matches", () => {
    render(<MatchGrid matchFeed={null} />);

    expect(screen.getByText("랭킹 하이라이트가 없습니다")).toBeInTheDocument();
  });

  it("tracks ranking click event payload", () => {
    render(<MatchGrid matchFeed={matchFeed} />);

    const cardLink = screen.getByRole("link", { name: /연습전/i });
    fireEvent.click(cardLink);

    expect(trackEventMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "home",
      dayKey: "2026-01-26",
      dishId: "match-1",
      source: "home_match_grid",
    });
  });
});
