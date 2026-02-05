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
        themeText: "비 오는 밤에 어울리는 닭꼬치 음식",
        themeTextEn: "Chicken skewers for a rainy night",
      },
      raw: {
        model: "gpt-5-mini",
        openAiResponseId: "r",
        outputText: "{}",
        outputJson: { themeText: "x", themeTextEn: "y" },
      },
    });

    const { getOrCreateDayTheme } = await import("./get-or-create-day-theme");
    const theme = await getOrCreateDayTheme("2026-02-05", { userId: null });

    expect(prisma.dayTheme.create).toHaveBeenCalled();
    expect(theme.themeText).toContain("에 어울리는");
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
