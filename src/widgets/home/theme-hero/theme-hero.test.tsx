import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ThemeHero from "./theme-hero";

const theme = {
  dayKey: "2026-01-26",
  themeText: "Cyberpunk Ramen",
  themeImageUrl: "https://example.com/theme.jpg",
};

describe("ThemeHero", () => {
  it("renders theme title and dayKey", () => {
    render(<ThemeHero theme={theme} />);

    expect(screen.getByText("Cyberpunk Ramen")).toBeInTheDocument();
    expect(screen.getByText("2026-01-26")).toBeInTheDocument();
  });

  it("applies background image when themeImageUrl exists", () => {
    render(<ThemeHero theme={theme} />);

    const heading = screen.getByText("Cyberpunk Ramen");
    const section = heading.closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveStyle({ backgroundImage: `url(${theme.themeImageUrl})` });
  });

  it("renders fallback text when theme is null", () => {
    render(<ThemeHero theme={null} />);

    expect(screen.getByText("오늘의 주제")).toBeInTheDocument();
    expect(screen.getByText("----")).toBeInTheDocument();
  });
});
