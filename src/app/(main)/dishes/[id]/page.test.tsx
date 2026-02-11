import { afterEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Dish detail page SSR fetch logic", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches /api/dishes/:id and passes ready status to screen", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
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
              displayName: "비빔 로열",
              userId: null,
              personaId: "bibim-royal",
            },
            theme: {
              dayKey: "2026-02-10",
              themeText: "테마",
            },
            score: {
              status: "ready",
              total: 91,
              themeFit: 94,
              execution: 88,
              oneLiner: "분석 코멘트",
              reasons: ["근거 1", "근거 2"],
              tip: "개선 팁",
            },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const DishDetailPage = (await import("./page")).default;
    const element = await DishDetailPage({
      params: Promise.resolve({ id: "dish-1" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/dishes\/dish-1$/),
      expect.any(Object),
    );
    expect(element).toMatchObject({
      props: {
        status: "ready",
        detail: {
          dish: {
            id: "dish-1",
          },
          author: {
            displayName: "비빔 로열",
          },
        },
      },
    });
  });

  it("maps restricted response to restricted state", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: "DISH_RESTRICTED",
            message: "제한된 요리입니다.",
          }),
          { status: 403 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const DishDetailPage = (await import("./page")).default;
    const element = await DishDetailPage({
      params: Promise.resolve({ id: "dish-locked" }),
    });

    expect(element).toMatchObject({
      props: {
        status: "restricted",
      },
    });
  });

  it("maps not found response to notFound state", async () => {
    headersMock.mockResolvedValue({
      get: () => null,
    });

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: "DISH_NOT_FOUND",
            message: "요리를 찾을 수 없습니다.",
          }),
          { status: 404 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const DishDetailPage = (await import("./page")).default;
    const element = await DishDetailPage({
      params: Promise.resolve({ id: "dish-404" }),
    });

    expect(element).toMatchObject({
      props: {
        status: "notFound",
      },
    });
  });
});
