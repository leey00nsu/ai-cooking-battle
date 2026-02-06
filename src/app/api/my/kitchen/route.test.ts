import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

const prisma = {
  user: {
    findUnique: vi.fn(),
  },
  activeEntry: {
    findUnique: vi.fn(),
  },
  dish: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: vi.fn(() => "2026-02-05"),
}));

describe("GET /api/my/kitchen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ representativeDishId: "dish_rep" });
    prisma.activeEntry.findUnique.mockResolvedValue({ isActive: true, dishId: "dish_rep" });
    prisma.dish.findMany.mockResolvedValue([
      {
        id: "dish_rep",
        prompt: "pizza",
        imageUrl: "https://cdn.example/pizza.webp",
        isHidden: false,
        createdAt: new Date("2026-02-05T00:00:00.000Z"),
        dayScores: [{ totalScore: 12.5 }],
      },
      {
        id: "dish2",
        prompt: "ramen",
        imageUrl: "https://cdn.example/ramen.webp",
        isHidden: true,
        createdAt: new Date("2026-02-04T00:00:00.000Z"),
        dayScores: [],
      },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const response = await GET(new Request("http://localhost/api/my/kitchen"));
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when session is null", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://localhost/api/my/kitchen"));
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("UNAUTHORIZED");
  });

  it("returns kitchen summary", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    const response = await GET(new Request("http://localhost/api/my/kitchen"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      representativeDishId: "dish_rep",
      isActive: true,
      dishes: [
        {
          id: "dish_rep",
          prompt: "pizza",
          imageUrl: "https://cdn.example/pizza.webp",
          isHidden: false,
          createdAt: "2026-02-05T00:00:00.000Z",
          dayScoreToday: 12.5,
        },
        {
          id: "dish2",
          prompt: "ramen",
          imageUrl: "https://cdn.example/ramen.webp",
          isHidden: true,
          createdAt: "2026-02-04T00:00:00.000Z",
          dayScoreToday: null,
        },
      ],
    });
  });

  it("returns 500 when database query fails", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    prisma.dish.findMany.mockRejectedValueOnce(new Error("db failed"));

    const response = await GET(new Request("http://localhost/api/my/kitchen"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  });
});
