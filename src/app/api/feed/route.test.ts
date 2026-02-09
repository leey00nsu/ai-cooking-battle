import { beforeEach, describe, expect, it, vi } from "vitest";

const listDishFeed = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/entities/feed/api/list-dish-feed", () => ({
  listDishFeed,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

describe("GET /api/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes query params to listDishFeed", async () => {
    listDishFeed.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/feed?limit=15&cursor=abc&search=ramen&sort=title_asc&excludeBots=true",
      ),
    );

    expect(response.status).toBe(200);
    expect(listDishFeed).toHaveBeenCalledWith({
      limit: 15,
      cursor: "abc",
      mine: false,
      excludeBots: true,
      userId: "",
      search: "ramen",
      sort: "title_asc",
    });
    expect(await response.json()).toEqual({ items: [], nextCursor: null });
  });

  it("passes filter params when mine and excludeBots are enabled", async () => {
    listDishFeed.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-1",
      },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/feed?limit=abc&mine=true&excludeBots=true"),
    );

    expect(response.status).toBe(200);
    expect(listDishFeed).toHaveBeenCalledWith({
      limit: undefined,
      cursor: null,
      mine: true,
      excludeBots: true,
      userId: "user-1",
      search: null,
      sort: null,
    });
  });

  it("returns 401 when mine=true and session is missing", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/feed?mine=true"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
    expect(listDishFeed).not.toHaveBeenCalled();
  });

  it("returns 500 when listDishFeed throws", async () => {
    listDishFeed.mockRejectedValueOnce(new Error("db failure"));

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/feed"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "피드 조회 중 오류가 발생했습니다.",
    });
  });
});
