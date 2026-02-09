import { beforeEach, describe, expect, it, vi } from "vitest";

const listDishFeed = vi.fn();

vi.mock("@/entities/feed/api/list-dish-feed", () => ({
  listDishFeed,
}));

describe("GET /api/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes limit and cursor query to listDishFeed", async () => {
    listDishFeed.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/feed?limit=15&cursor=abc"));

    expect(response.status).toBe(200);
    expect(listDishFeed).toHaveBeenCalledWith({ limit: 15, cursor: "abc" });
    expect(await response.json()).toEqual({ items: [], nextCursor: null });
  });

  it("passes undefined limit and null cursor when missing or invalid", async () => {
    listDishFeed.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/feed?limit=abc"));

    expect(response.status).toBe(200);
    expect(listDishFeed).toHaveBeenCalledWith({ limit: undefined, cursor: null });
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
