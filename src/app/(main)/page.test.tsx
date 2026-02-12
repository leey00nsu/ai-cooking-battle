import { describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Home page SSR fetch logic", () => {
  it("uses /api/home/matches (not /api/feed) and does not mark slot as error for guest", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.endsWith("/api/slots/public-summary")) {
        return new Response(
          JSON.stringify({
            freeLimit: 60,
            freeUsedCount: 0,
            adLimit: 0,
            adUsedCount: 0,
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/theme/today")) {
        return new Response(JSON.stringify({ dayKey: "2026-02-05" }), { status: 200 });
      }
      if (url.includes("/api/home/matches")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (url.includes("/api/snapshot/")) {
        return new Response(JSON.stringify({ dayKey: "2026-02-05", items: [] }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const Home = (await import("./page")).default;
    const element = await Home();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/slots\/public-summary$/),
      expect.any(Object),
    );
    expect(
      fetchMock.mock.calls.some(
        (args) => typeof args[0] === "string" && args[0].includes("/api/home/matches"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        (args) =>
          typeof args[0] === "string" && args[0].includes("/api/snapshot/2026-02-05?count=4"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        (args) => typeof args[0] === "string" && args[0].includes("/api/feed"),
      ),
    ).toBe(false);
    expect(element).toMatchObject({
      props: {
        isSlotError: false,
      },
    });
  });

  it("marks isMatchError=true when /api/home/matches request fails", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) {
        return new Response(JSON.stringify({ status: "GUEST" }), { status: 200 });
      }
      if (url.endsWith("/api/theme/today")) {
        return new Response(JSON.stringify({ dayKey: "2026-02-05" }), { status: 200 });
      }
      if (url.includes("/api/home/matches")) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
      if (url.includes("/api/snapshot/")) {
        return new Response(JSON.stringify({ dayKey: "2026-02-05", items: [] }), { status: 200 });
      }
      if (url.endsWith("/api/slots/public-summary")) {
        return new Response(
          JSON.stringify({
            freeLimit: 60,
            freeUsedCount: 0,
            adLimit: 0,
            adUsedCount: 0,
          }),
          { status: 200 },
        );
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const Home = (await import("./page")).default;
    const element = await Home();

    expect(element).toMatchObject({
      props: {
        isMatchError: true,
      },
    });
  });
});
