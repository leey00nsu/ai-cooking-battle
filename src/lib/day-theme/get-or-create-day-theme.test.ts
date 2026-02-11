import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/providers/provider-error";

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

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/providers/openai-day-theme-generator", () => ({
  generateDayThemeWithOpenAiWithRaw,
}));

describe("getOrCreateDayTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.dayTheme.findUnique.mockResolvedValue(null);
    prisma.dayTheme.findMany.mockResolvedValue([]);
    prisma.dayTheme.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    prisma.openAiCallLog.create.mockResolvedValue({ id: "log" });
  });

  it("creates DayTheme from OpenAI when available", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DAY_THEME_MODEL", "gpt-5-mini");
    generateDayThemeWithOpenAiWithRaw.mockResolvedValueOnce({
      result: {
        ok: true,
        themeText: "비 오는 밤에 어울리는 닭꼬치 매콤한 풍미의 음식",
        themeTextEn: "A dish with spicy-flavored chicken skewers suitable for a rainy night",
        axisAType: "상황",
        axisA: "비 오는 밤",
        axisBType: "특정재료",
        axisB: "닭꼬치",
        axisFlavor: "매콤한",
        themeWeights: { A: 15, B: 55, F: 30 },
        themeSignals: {
          A: ["따뜻한 실내 조명"],
          B: ["꼬치 형태의 메인 구성"],
          F: ["붉은 양념 포인트"],
        },
      },
      raw: {
        model: "gpt-5-mini",
        openAiResponseId: "r",
        outputText: "{}",
        outputJson: { themeText: "x", themeTextEn: "y", axisAType: "상황", axisBType: "특정재료" },
      },
    });

    const { getOrCreateDayTheme } = await import("./get-or-create-day-theme");
    const theme = await getOrCreateDayTheme("2026-02-05", { userId: null });

    expect(prisma.dayTheme.create).toHaveBeenCalled();
    expect(theme.themeText).toContain("에 어울리는");
    expect(theme.axisAType).toBe("상황");
    expect(theme.axisBType).toBe("특정재료");
    expect(theme.themeWeights).toEqual({ A: 15, B: 55, F: 30 });
    expect(theme.themeSignals).toEqual({
      A: ["따뜻한 실내 조명"],
      B: ["꼬치 형태의 메인 구성"],
      F: ["붉은 양념 포인트"],
    });
    expect(prisma.openAiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "DAY_THEME",
          decision: "OK",
        }),
      }),
    );
  });

  it("falls back when OpenAI fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    generateDayThemeWithOpenAiWithRaw.mockRejectedValueOnce(
      new ProviderError({ provider: "openai", code: "TIMEOUT", message: "timeout" }),
    );

    const { getOrCreateDayTheme } = await import("./get-or-create-day-theme");
    const theme = await getOrCreateDayTheme("2026-02-05", { userId: null });

    expect(theme.themeText).toContain("에 어울리는");
    expect(theme.axisAType).toBeTruthy();
    expect(theme.axisBType).toBeTruthy();
    expect(theme.axisFlavor).toBeTruthy();
    expect(theme.themeWeights).toEqual({ A: 15, B: 55, F: 30 });
    expect(theme.themeSignals).toEqual({
      A: ["일상 상황이 느껴지는 간단한 상차림"],
      B: ["요리 형태가 주제 축과 일치"],
      F: ["풍미를 드러내는 재료 포인트"],
    });
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
