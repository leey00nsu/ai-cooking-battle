import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dish: {
    findUnique: vi.fn(),
  },
  dayTheme: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("getDishDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INVALID_DISH_ID for malformed id", async () => {
    const { getDishDetail } = await import("./get-dish-detail");
    const result = await getDishDetail(" ");

    expect(result).toEqual({
      type: "error",
      code: "INVALID_DISH_ID",
      message: "유효하지 않은 dishId 형식입니다.",
    });
    expect(prisma.dish.findUnique).not.toHaveBeenCalled();
  });

  it("returns DISH_NOT_FOUND when dish does not exist", async () => {
    prisma.dish.findUnique.mockResolvedValueOnce(null);

    const { getDishDetail } = await import("./get-dish-detail");
    const result = await getDishDetail("dish-404");

    expect(result).toEqual({
      type: "error",
      code: "DISH_NOT_FOUND",
      message: "요리를 찾을 수 없습니다.",
    });
  });

  it("returns DISH_RESTRICTED when dish is hidden", async () => {
    prisma.dish.findUnique.mockResolvedValueOnce({
      isHidden: true,
    });

    const { getDishDetail } = await import("./get-dish-detail");
    const result = await getDishDetail("dish-hidden");

    expect(result).toEqual({
      type: "error",
      code: "DISH_RESTRICTED",
      message: "제한된 요리입니다.",
    });
  });

  it("returns ready score for bot dish with persona display name", async () => {
    prisma.dish.findUnique.mockResolvedValueOnce({
      id: "dish-1",
      userId: "bot-system-user",
      dishName: "비빔 로열 해산물 요리",
      dishNameEn: "Seafood Bowl",
      imageUrl: "https://cdn.example/dish.webp",
      createdAt: new Date("2026-02-10T00:00:00.000Z"),
      isHidden: false,
      user: {
        name: "AI Chef Bot",
      },
      botMeta: {
        personaKey: "bibim-royal",
        persona: {
          displayName: "비빔 로열",
        },
      },
      dayScores: [
        {
          dayKey: "2026-02-10",
          totalScore: 88,
          themeFit: 90,
          execution: 86,
          oneLiner: "주제와 스타일이 잘 살아있습니다.",
          reasons: ["색감 대비 우수", "주제 부합도 높음"],
          tip: "중심 재료 대비를 더 강조하세요.",
          status: "READY",
        },
      ],
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      dayKey: "2026-02-10",
      themeText: "늦여름 해변 산책에 어울리는 상큼한 해산물 샐러드",
    });

    const { getDishDetail } = await import("./get-dish-detail");
    const result = await getDishDetail("dish-1");

    expect(result).toEqual({
      type: "success",
      dish: {
        id: "dish-1",
        imageUrl: "https://cdn.example/dish.webp",
        dishName: "비빔 로열 해산물 요리",
        dishNameEn: "Seafood Bowl",
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
        themeText: "늦여름 해변 산책에 어울리는 상큼한 해산물 샐러드",
      },
      score: {
        status: "ready",
        total: 88,
        themeFit: 90,
        execution: 86,
        oneLiner: "주제와 스타일이 잘 살아있습니다.",
        reasons: ["색감 대비 우수", "주제 부합도 높음"],
        tip: "중심 재료 대비를 더 강조하세요.",
      },
    });
  });

  it("returns pending score when score is not READY", async () => {
    prisma.dish.findUnique.mockResolvedValueOnce({
      id: "dish-2",
      userId: "user-1",
      dishName: "유저 요리",
      dishNameEn: null,
      imageUrl: "https://cdn.example/user-dish.webp",
      createdAt: new Date("2026-02-10T00:00:00.000Z"),
      isHidden: false,
      user: {
        name: "User One",
      },
      botMeta: null,
      dayScores: [
        {
          dayKey: "2026-02-10",
          totalScore: 0,
          themeFit: 0,
          execution: 0,
          oneLiner: null,
          reasons: null,
          tip: null,
          status: "PENDING",
        },
      ],
    });
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      dayKey: "2026-02-10",
      themeText: "테마",
    });

    const { getDishDetail } = await import("./get-dish-detail");
    const result = await getDishDetail("dish-2");

    expect(result).toEqual({
      type: "success",
      dish: {
        id: "dish-2",
        imageUrl: "https://cdn.example/user-dish.webp",
        dishName: "유저 요리",
        dishNameEn: null,
        createdAt: "2026-02-10T00:00:00.000Z",
      },
      author: {
        type: "user",
        displayName: "User One",
        userId: "user-1",
        personaId: null,
      },
      theme: {
        dayKey: "2026-02-10",
        themeText: "테마",
      },
      score: {
        status: "pending",
        total: null,
        themeFit: null,
        execution: null,
        oneLiner: null,
        reasons: null,
        tip: null,
      },
    });
  });
});
