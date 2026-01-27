import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchGrid from "./match-grid";

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

    expect(screen.getByText(/최신 매치 1개/)).toBeInTheDocument();
    expect(screen.getByText("연습전")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "View Feed" })).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/matches/match-1")).toBe(
      true,
    );
  });

  it("renders empty state when no matches", () => {
    render(<MatchGrid matchFeed={null} />);

    expect(screen.getByText("매치가 없습니다")).toBeInTheDocument();
  });
});
