import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedHeaderShell } from "./feed-header-shell";

describe("FeedHeaderShell", () => {
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
});
