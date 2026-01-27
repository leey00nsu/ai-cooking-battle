import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Highlights from "./highlights";

const snapshotTop = {
  dayKey: "2026-01-26",
  items: [
    {
      rank: 1,
      dishId: "dish-1",
      leftImageUrl: "https://example.com/left.jpg",
      rightImageUrl: "https://example.com/right.jpg",
      leftScore: 9.8,
      rightScore: 8.5,
    },
    {
      rank: 2,
      dishId: "dish-2",
      leftImageUrl: "",
      rightImageUrl: "",
      leftScore: 9.2,
      rightScore: 9.1,
    },
  ],
};

describe("Highlights", () => {
  it("renders snapshot cards", () => {
    render(<Highlights snapshotTop={snapshotTop} />);

    expect(screen.getByText(/Battle Highlights — Top Rated/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Ladder" })).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((link) => link.getAttribute("href") === "/snapshot/2026-01-26")).toBe(
      true,
    );
  });

  it("renders empty state when no data", () => {
    render(<Highlights snapshotTop={null} />);

    expect(screen.getByText("하이라이트가 없습니다")).toBeInTheDocument();
  });
});
