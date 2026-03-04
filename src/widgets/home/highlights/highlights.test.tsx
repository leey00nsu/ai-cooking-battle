import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import Highlights from "./highlights";

const { trackEventMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: trackEventMock,
}));

const rankingTop = {
  dayKey: "2026-01-26",
  items: [
    {
      rank: 1,
      dishId: "dish-1",
      dishName: "Hall Dish #01",
      authorName: "Chef_01",
      imageUrl: "https://example.com/winner-1.jpg",
      score: 9.8,
    },
    {
      rank: 2,
      dishId: "dish-2",
      dishName: "Hall Dish #02",
      authorName: "Chef_02",
      imageUrl: "https://example.com/winner-2.jpg",
      score: 9.2,
    },
  ],
};

describe("Highlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ranking cards", () => {
    render(<Highlights rankingTop={rankingTop} />);

    expect(screen.getByText(/오늘의 랭킹 — Top Rated/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "랭킹 보기" })).toBeInTheDocument();
    expect(screen.getByText("Hall Dish #01")).toBeInTheDocument();
    expect(screen.getByText("Chef_01")).toBeInTheDocument();
    expect(screen.queryByText("vs")).not.toBeInTheDocument();
    expect(screen.queryByText(/Winner:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/대결/)).not.toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/ranking/2026-01-26")).toBe(true);
  });

  it("renders empty state when no data", () => {
    render(<Highlights rankingTop={null} />);

    expect(screen.getByText("하이라이트가 없습니다")).toBeInTheDocument();
  });

  it("renders error state when request fails", () => {
    render(<Highlights rankingTop={rankingTop} isError />);

    expect(screen.getByText("하이라이트 오류")).toBeInTheDocument();
  });

  it("renders restricted state for limited user", () => {
    render(<Highlights rankingTop={rankingTop} isRestricted />);

    expect(screen.getByText("하이라이트 제한")).toBeInTheDocument();
  });

  it("tracks ranking click event payload", () => {
    render(<Highlights rankingTop={rankingTop} />);

    const cardLink = screen.getByRole("link", { name: /Hall Dish #01/i });
    fireEvent.click(cardLink);

    expect(trackEventMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.RANKING_ITEM_CLICKED, {
      screen: "home",
      dayKey: "2026-01-26",
      rank: 1,
      dishId: "dish-1",
    });
  });
});
