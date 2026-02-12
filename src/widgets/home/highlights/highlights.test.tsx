import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Highlights from "./highlights";

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
      leftImageUrl: "https://example.com/left.jpg",
      rightImageUrl: "https://example.com/right.jpg",
      leftScore: 9.8,
      rightScore: 8.5,
    },
    {
      rank: 2,
      dishId: "dish-2",
      dishName: "Hall Dish #02",
      authorName: "Chef_02",
      imageUrl: "https://example.com/winner-2.jpg",
      score: 9.2,
      leftImageUrl: "",
      rightImageUrl: "",
      leftScore: 9.2,
      rightScore: 9.1,
    },
  ],
};

describe("Highlights", () => {
  it("renders ranking cards", () => {
    render(<Highlights rankingTop={rankingTop} />);

    expect(screen.getByText(/오늘의 랭킹 — Top Rated/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Ranking" })).toBeInTheDocument();

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
});
