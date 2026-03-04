import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentMatchesPanel } from "./recent-matches-panel";

describe("RecentMatchesPanel", () => {
  it("routes recent cards to ranking day pages", () => {
    render(
      <RecentMatchesPanel
        matches={[
          {
            id: "match-1",
            dayKey: "2026-02-22",
            leftDishImageUrl: "https://example.com/a.jpg",
            rightDishImageUrl: "https://example.com/b.jpg",
            leftScore: 9.1,
            rightScore: 8.4,
            isPractice: false,
          },
        ]}
        isPending={false}
        isError={false}
      />,
    );

    expect(screen.getByText("Recent Ranking Days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ranking Snapshot/i })).toHaveAttribute(
      "href",
      "/ranking/2026-02-22",
    );
    expect(screen.getByText("Top Score")).toBeInTheDocument();
    expect(screen.getByText("9.1")).toBeInTheDocument();
  });

  it("renders ranking-oriented empty copy", () => {
    render(<RecentMatchesPanel matches={[]} isPending={false} isError={false} />);

    expect(screen.getByText("최근 랭킹 기록이 없습니다.")).toBeInTheDocument();
  });
});
