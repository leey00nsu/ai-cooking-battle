import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Ranking page SSR fetch logic", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    headersMock.mockResolvedValue({
      get: () => null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("renders ready status and requests ranking archive payload", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.includes("/api/ranking/2026-02-11?view=archive&limit=12")) {
        return new Response(
          JSON.stringify({
            dayKey: "2026-02-11",
            themeText: "비 오는 날에 어울리는 버터 마늘 풍미의 음식",
            participantCount: 42,
            averageScore: 84.5,
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
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const RankingPage = (await import("./page")).default;
    const element = await RankingPage({
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ranking\/2026-02-11\?view=archive&limit=12$/),
      expect.any(Object),
    );
    expect(element).toMatchObject({
      props: {
        dayKey: "2026-02-11",
        status: "ready",
      },
    });
  });

  it("renders empty status when ranking has no items", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "AUTH" }), { status: 200 });
      }
      if (url.includes("/api/ranking/2026-02-11?view=archive&limit=12")) {
        return new Response(
          JSON.stringify({
            dayKey: "2026-02-11",
            themeText: "",
            participantCount: 0,
            averageScore: 0,
            keywordGroups: [],
            items: [],
            nextOffset: null,
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const RankingPage = (await import("./page")).default;
    const element = await RankingPage({
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(element).toMatchObject({
      props: {
        dayKey: "2026-02-11",
        status: "empty",
      },
    });
  });

  it("renders error status when ranking request fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.includes("/api/ranking/2026-02-11?view=archive&limit=12")) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const RankingPage = (await import("./page")).default;
    const element = await RankingPage({
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(element).toMatchObject({
      props: {
        dayKey: "2026-02-11",
        status: "error",
      },
    });
  });
});
