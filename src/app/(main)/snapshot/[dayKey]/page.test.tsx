import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Snapshot page SSR fetch logic", () => {
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

  it("renders ready status and requests snapshot with count=10", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.includes("/api/snapshot/2026-02-11?count=10")) {
        return new Response(
          JSON.stringify({
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
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const SnapshotPage = (await import("./page")).default;
    const element = await SnapshotPage({
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/snapshot\/2026-02-11\?count=10$/),
      expect.any(Object),
    );
    expect(element).toMatchObject({
      props: {
        dayKey: "2026-02-11",
        status: "ready",
      },
    });
  });

  it("renders empty status when snapshot has no items", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "AUTH" }), { status: 200 });
      }
      if (url.includes("/api/snapshot/2026-02-11?count=10")) {
        return new Response(
          JSON.stringify({
            dayKey: "2026-02-11",
            items: [],
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const SnapshotPage = (await import("./page")).default;
    const element = await SnapshotPage({
      params: Promise.resolve({ dayKey: "2026-02-11" }),
    });

    expect(element).toMatchObject({
      props: {
        dayKey: "2026-02-11",
        status: "empty",
      },
    });
  });

  it("renders error status when snapshot request fails", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.includes("/api/snapshot/2026-02-11?count=10")) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const SnapshotPage = (await import("./page")).default;
    const element = await SnapshotPage({
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
