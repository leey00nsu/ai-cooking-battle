import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RankingScreen", () => {
  it("renders detail links with /dishes/:id in ready state", () => {
    renderWithQueryClient(
      <RankingScreen
        dayKey="2026-02-11"
        status="ready"
        initialData={{
          dayKey: "2026-02-11",
          themeText: "비 오는 날에 어울리는 매콤한 국물 음식",
          participantCount: 4,
          averageScore: 87.3,
          keywordGroups: [],
          items: [
            {
              rank: 1,
              dishId: "dish-1",
              dishName: "Champion Dish",
              authorName: "Chef_01",
              imageUrl: "https://example.com/dish-1.jpg",
              score: 9.9,
            },
            {
              rank: 2,
              dishId: "dish-2",
              dishName: "Runner Up",
              authorName: "Chef_02",
              imageUrl: "https://example.com/dish-2.jpg",
              score: 9.4,
            },
          ],
          nextOffset: null,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View Analysis" })).toHaveAttribute(
      "href",
      "/dishes/dish-1",
    );
    expect(screen.getByRole("link", { name: "View Dish" })).toHaveAttribute(
      "href",
      "/dishes/dish-2",
    );
    expect(screen.getByRole("button", { name: "View Full Calendar" })).toBeInTheDocument();
    expect(screen.getByText("주제:")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Winning Keywords")).toBeInTheDocument();
  });

  it("renders empty state message", () => {
    renderWithQueryClient(<RankingScreen dayKey="2026-02-11" status="empty" initialData={null} />);

    expect(screen.getByText("해당 날짜의 랭킹이 없습니다")).toBeInTheDocument();
  });

  it("renders error state message", () => {
    renderWithQueryClient(<RankingScreen dayKey="2026-02-11" status="error" initialData={null} />);

    expect(screen.getByText("랭킹 데이터를 불러오지 못했습니다")).toBeInTheDocument();
  });

  it("renders empty state when search result is empty", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          dayKey: "2026-02-11",
          themeText: "비 오는 날에 어울리는 매콤한 국물 음식",
          participantCount: 0,
          averageScore: 0,
          keywordGroups: [],
          items: [],
          nextOffset: null,
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    renderWithQueryClient(
      <RankingScreen
        dayKey="2026-02-11"
        status="ready"
        initialData={{
          dayKey: "2026-02-11",
          themeText: "비 오는 날에 어울리는 매콤한 국물 음식",
          participantCount: 2,
          averageScore: 88,
          keywordGroups: [],
          items: [
            {
              rank: 1,
              dishId: "dish-1",
              dishName: "Champion Dish",
              authorName: "Chef_01",
              imageUrl: "https://example.com/dish-1.jpg",
              score: 9.9,
            },
          ],
          nextOffset: null,
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("요리명 검색"), { target: { value: "없는요리" } });

    await waitFor(
      () => {
        expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    expect(screen.getByRole("button", { name: "검색 초기화" })).toBeInTheDocument();
  });
});
