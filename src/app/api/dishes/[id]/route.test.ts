import { beforeEach, describe, expect, it, vi } from "vitest";

const getDishDetail = vi.fn();

vi.mock("@/entities/dish/api/get-dish-detail", () => ({
  getDishDetail,
}));

describe("GET /api/dishes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dish detail when request succeeds", async () => {
    getDishDetail.mockResolvedValueOnce({
      type: "success",
      dish: {
        id: "dish-1",
        imageUrl: "https://cdn.example/dish.webp",
        dishName: "요리명",
        dishNameEn: "Dish Name",
        createdAt: "2026-02-10T00:00:00.000Z",
      },
      author: {
        type: "bot",
        displayName: "트리플 실루엣",
        userId: null,
        personaId: "triple-silhouette",
      },
      theme: {
        dayKey: "2026-02-10",
        themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      },
      score: {
        status: "ready",
        total: 90,
        themeFit: 92,
        execution: 88,
        oneLiner: "완성도가 높습니다.",
        reasons: ["주제 부합", "플레이팅 선명"],
        tip: "질감 대비를 높여보세요.",
      },
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/dishes/dish-1"), {
      params: Promise.resolve({ id: "dish-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      dish: {
        id: "dish-1",
        imageUrl: "https://cdn.example/dish.webp",
        dishName: "요리명",
        dishNameEn: "Dish Name",
        createdAt: "2026-02-10T00:00:00.000Z",
      },
      author: {
        type: "bot",
        displayName: "트리플 실루엣",
        userId: null,
        personaId: "triple-silhouette",
      },
      theme: {
        dayKey: "2026-02-10",
        themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      },
      score: {
        status: "ready",
        total: 90,
        themeFit: 92,
        execution: 88,
        oneLiner: "완성도가 높습니다.",
        reasons: ["주제 부합", "플레이팅 선명"],
        tip: "질감 대비를 높여보세요.",
      },
    });
  });

  it("returns 400 when dish id is invalid", async () => {
    getDishDetail.mockResolvedValueOnce({
      type: "error",
      code: "INVALID_DISH_ID",
      message: "유효하지 않은 dishId 형식입니다.",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/dishes/%20"), {
      params: Promise.resolve({ id: " " }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INVALID_DISH_ID",
      message: "유효하지 않은 dishId 형식입니다.",
    });
  });

  it("returns 404 when dish is not found", async () => {
    getDishDetail.mockResolvedValueOnce({
      type: "error",
      code: "DISH_NOT_FOUND",
      message: "요리를 찾을 수 없습니다.",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/dishes/dish-x"), {
      params: Promise.resolve({ id: "dish-x" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      code: "DISH_NOT_FOUND",
      message: "요리를 찾을 수 없습니다.",
    });
  });

  it("returns 403 when dish is restricted", async () => {
    getDishDetail.mockResolvedValueOnce({
      type: "error",
      code: "DISH_RESTRICTED",
      message: "제한된 요리입니다.",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/dishes/dish-hidden"), {
      params: Promise.resolve({ id: "dish-hidden" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "DISH_RESTRICTED",
      message: "제한된 요리입니다.",
    });
  });
});
