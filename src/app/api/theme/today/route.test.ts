import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

const getSessionMock = vi.fn();
const prisma = {
  dayTheme: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  openAiCallLog: {
    create: vi.fn(),
  },
};

const generateDayThemeWithOpenAiWithRaw = vi.fn();
const enqueueDayThemePrecreateJob = vi.fn(async () => "job");

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/providers/openai-day-theme-generator", () => ({
  generateDayThemeWithOpenAiWithRaw,
}));

vi.mock("@/lib/queue/day-theme-precreate-job", () => ({
  enqueueDayThemePrecreateJob,
}));

describe("GET /api/theme/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    getSessionMock.mockResolvedValue(null);
    prisma.dayTheme.findMany.mockResolvedValue([]);
    prisma.openAiCallLog.create.mockResolvedValue({ id: "log" });
  });

  it("returns existing DayTheme (idempotent)", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce({
      dayKey: "2026-02-05",
      themeText: "비 오는 밤에 어울리는 닭꼬치 음식",
      themeTextEn: "Chicken skewers for a rainy night",
      themeImageUrl: "https://example.com/theme.jpg",
    });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/theme/today"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      dayKey: "2026-02-05",
      themeText: "비 오는 밤에 어울리는 닭꼬치 음식",
      themeTextEn: "Chicken skewers for a rainy night",
      themeImageUrl: "https://example.com/theme.jpg",
    });
    expect(prisma.dayTheme.create).not.toHaveBeenCalled();
    expect(enqueueDayThemePrecreateJob).not.toHaveBeenCalled();
  });

  it("creates DayTheme and returns it; second call returns the same theme", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      dayKey: "2026-02-05",
      themeText: "봄 소풍, 공원에 어울리는 딸기와 요거트가 들어간 디저트",
      themeTextEn: "A strawberry-and-yogurt dessert for a spring picnic in the park",
      themeImageUrl: null,
    });

    prisma.dayTheme.create.mockResolvedValueOnce({
      dayKey: "2026-02-05",
      themeText: "봄 소풍, 공원에 어울리는 딸기와 요거트가 들어간 디저트",
      themeTextEn: "A strawberry-and-yogurt dessert for a spring picnic in the park",
      themeImageUrl: null,
    });

    const { GET } = await import("./route");
    const first = await GET(new Request("http://localhost/api/theme/today"));
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(firstJson).toMatchObject({
      themeTextEn: expect.any(String),
      themeText: expect.stringContaining("에 어울리는"),
    });
    expect(enqueueDayThemePrecreateJob).toHaveBeenCalledWith({ dayKey: "2026-02-05" });

    const second = await GET(new Request("http://localhost/api/theme/today"));
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson).toEqual(firstJson);
  });

  it("re-reads when UNIQUE conflict occurs during create (race condition)", async () => {
    prisma.dayTheme.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      dayKey: "2026-02-05",
      themeText: "한여름 해변, 바다에 어울리는 라임이 들어간 새우 타코",
      themeTextEn: "Shrimp tacos with lime for a midsummer beach day",
      themeImageUrl: null,
    });
    prisma.dayTheme.create.mockRejectedValueOnce({ code: "P2002" });

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/theme/today"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dayKey: "2026-02-05",
      themeTextEn: expect.any(String),
      themeText: expect.stringContaining("에 어울리는"),
    });
    expect(enqueueDayThemePrecreateJob).toHaveBeenCalledWith({ dayKey: "2026-02-05" });
  });

  it("falls back when OpenAI provider fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DAY_THEME_MODEL", "gpt-5-mini");
    prisma.dayTheme.findUnique.mockResolvedValueOnce(null);
    prisma.dayTheme.findMany.mockResolvedValueOnce(["어제의 주제"]);
    prisma.dayTheme.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    generateDayThemeWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({ provider: "openai", code: "TIMEOUT", message: "timeout" }),
    );

    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/theme/today"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.themeText).toContain("에 어울리는");
    expect(payload.themeTextEn).toEqual(expect.any(String));
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DAY_THEME",
          decision: "FALLBACK",
          errorCode: "TIMEOUT",
        }),
      }),
    );
  });
});
