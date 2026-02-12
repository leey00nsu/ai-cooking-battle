import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import RankingScreen from "./ranking-screen";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children as ReactNode}
    </a>
  ),
}));

vi.mock("./ranking-analytics", () => ({
  default: () => null,
}));

describe("RankingScreen", () => {
  it("renders detail links with /dishes/:id in ready state", () => {
    render(
      <RankingScreen
        dayKey="2026-02-11"
        status="ready"
        rankingTop={{
          dayKey: "2026-02-11",
          items: [
            {
              rank: 1,
              dishId: "dish-1",
              dishName: "Champion Dish",
              authorName: "Chef_01",
              imageUrl: "https://example.com/dish-1.jpg",
              score: 9.9,
              leftImageUrl: "https://example.com/left-1.jpg",
              rightImageUrl: "https://example.com/right-1.jpg",
              leftScore: 9.9,
              rightScore: 9.5,
            },
            {
              rank: 2,
              dishId: "dish-2",
              dishName: "Runner Up",
              authorName: "Chef_02",
              imageUrl: "https://example.com/dish-2.jpg",
              score: 9.4,
              leftImageUrl: "https://example.com/left-2.jpg",
              rightImageUrl: "https://example.com/right-2.jpg",
              leftScore: 9.4,
              rightScore: 9.1,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View Analysis" })).toHaveAttribute(
      "href",
      "/dishes/dish-1",
    );
    expect(screen.getByRole("link", { name: "상세 보기" })).toHaveAttribute(
      "href",
      "/dishes/dish-2",
    );
  });

  it("renders empty state message", () => {
    render(<RankingScreen dayKey="2026-02-11" status="empty" rankingTop={null} />);

    expect(screen.getByText("해당 날짜의 랭킹이 없습니다")).toBeInTheDocument();
  });

  it("renders error state message", () => {
    render(<RankingScreen dayKey="2026-02-11" status="error" rankingTop={null} />);

    expect(screen.getByText("오늘의 랭킹을 불러오지 못했습니다")).toBeInTheDocument();
  });
});
