import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeedScreen from "./feed-screen";

const baseFilters = {
  mine: false,
  excludeBots: false,
  search: "",
  sort: "latest" as const,
};

describe("FeedScreen", () => {
  it("renders shared error state with retry action", () => {
    render(
      <FeedScreen
        feed={null}
        filters={{
          mine: true,
          excludeBots: true,
          search: "ramen",
          sort: "title_desc",
        }}
        isError
      />,
    );

    expect(screen.getByText("피드를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다시 시도" })).toHaveAttribute(
      "href",
      "/feed?mine=true&excludeBots=true&search=ramen&sort=title_desc",
    );
  });

  it("renders empty state message when feed has no items", () => {
    render(
      <FeedScreen
        feed={{
          items: [],
          nextCursor: null,
        }}
        filters={baseFilters}
      />,
    );

    expect(screen.getByText("오늘의 요리를 생성중입니다.")).toBeInTheDocument();
  });

  it("renders guest mine warning when mine filter fallback is active", () => {
    render(
      <FeedScreen
        feed={{
          items: [],
          nextCursor: null,
        }}
        filters={{
          ...baseFilters,
          mine: true,
        }}
        mineUnauthorized
      />,
    );

    expect(
      screen.getByText("Mine 필터는 로그인 후 사용할 수 있습니다. 현재 전체 요리를 표시합니다."),
    ).toBeInTheDocument();
  });

  it("renders spotlight and recent dishes when feed has items", () => {
    render(
      <FeedScreen
        feed={{
          items: [
            {
              id: "dish-1",
              prompt: "First Dish",
              imageUrl: "https://example.com/1.jpg",
              createdAt: "2026-02-10T10:00:00.000Z",
              authorType: "user",
              authorLabel: "Chef A",
            },
            {
              id: "dish-2",
              prompt: "Second Dish",
              imageUrl: "https://example.com/2.jpg",
              createdAt: "2026-02-10T10:10:00.000Z",
              authorType: "bot",
              authorLabel: "AI Chef",
            },
          ],
          nextCursor: null,
        }}
        filters={baseFilters}
      />,
    );

    expect(screen.getByText("Latest Dish Spotlight")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /First Dish detail page/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Second Dish detail page/i })).toBeInTheDocument();
  });
});
