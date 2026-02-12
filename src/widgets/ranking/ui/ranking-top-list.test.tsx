import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { trackEvent } from "@/shared/analytics/track-event";
import { RankingTopList } from "./ranking-top-list";

vi.mock("next/link", () => ({
  default: ({ href, onClick, children, ...props }: Record<string, unknown>) => (
    <a
      href={typeof href === "string" ? href : ""}
      onClick={(event) => {
        event.preventDefault();
        if (typeof onClick === "function") {
          onClick(event);
        }
      }}
      {...props}
    >
      {children as ReactNode}
    </a>
  ),
}));

vi.mock("@/shared/analytics/track-event", () => ({
  trackEvent: vi.fn(),
}));

describe("RankingTopList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks item click with dayKey and rank", () => {
    render(
      <RankingTopList
        dayKey="2026-02-12"
        items={[
          {
            rank: 2,
            dishId: "dish-2",
            dishName: "Runner Up",
            authorName: "Chef_02",
            imageUrl: "https://example.com/dish-2.jpg",
            score: 9.2,
            leftImageUrl: "https://example.com/left.jpg",
            rightImageUrl: "https://example.com/right.jpg",
            leftScore: 9.2,
            rightScore: 8.7,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "상세 보기" }));

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.RANKING_ITEM_CLICKED,
      expect.objectContaining({
        screen: "ranking",
        section: "top_list",
        dayKey: "2026-02-12",
        rank: 2,
        dishId: "dish-2",
      }),
    );
  });
});
