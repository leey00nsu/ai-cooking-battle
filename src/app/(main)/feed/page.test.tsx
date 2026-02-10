import { describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Feed page SSR fetch logic", () => {
  it("forwards filter query params to /api/feed", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const FeedPage = (await import("./page")).default;
    const element = await FeedPage({
      searchParams: Promise.resolve({
        mine: "true",
        excludeBots: "true",
        search: "ramen",
        sort: "title_asc",
      }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/feed\?limit=13&mine=true&excludeBots=true&search=ramen&sort=title_asc$/,
      ),
      expect.any(Object),
    );
    expect(element).toMatchObject({
      props: {
        filters: {
          mine: true,
          excludeBots: true,
          search: "ramen",
          sort: "title_asc",
        },
      },
    });
  });

  it("falls back to all feed when mine=true is unauthorized", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: false,
            code: "UNAUTHORIZED",
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [{ id: "dish-1" }], nextCursor: null }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const FeedPage = (await import("./page")).default;
    const element = await FeedPage({
      searchParams: Promise.resolve({
        mine: "true",
      }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/api\/feed\?limit=13&mine=true$/),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/feed\?limit=13$/),
      expect.any(Object),
    );

    expect(element).toMatchObject({
      props: {
        mineUnauthorized: true,
      },
    });
  });
});
