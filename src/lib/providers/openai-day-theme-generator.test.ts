import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn(async () => ({
  output_text:
    '{"themeText":"비 오는 밤에 어울리는 닭꼬치 매콤한 풍미의 음식","themeTextEn":"A dish with spicy-flavored chicken skewers suitable for a rainy night","axisAType":"상황","axisA":"비 오는 밤","axisBType":"특정재료","axisB":"닭꼬치","axisFlavor":"매콤한"}',
}));

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: responsesCreateMock,
    };
  }

  return { default: OpenAI };
});

import { generateDayThemeWithOpenAiWithRaw } from "@/lib/providers/openai-day-theme-generator";

describe("openai-day-theme-generator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses day theme response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DAY_THEME_MODEL", "gpt-5-mini");

    const result = await generateDayThemeWithOpenAiWithRaw({
      dayKey: "2026-02-05",
      recentThemesKo: ["어제의 주제"],
    });

    expect(result.result.ok).toBe(true);
    expect(result.result.themeText).toContain("에 어울리는");
    expect(result.result.themeTextEn.length).toBeGreaterThan(3);
    expect(result.result.axisAType).toBe("상황");
    expect(result.result.axisBType).toBe("특정재료");
    expect(result.result.axisFlavor).toBe("매콤한");
  });

  it("throws when response JSON is invalid", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DAY_THEME_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({ output_text: "not json" });

    await expect(
      generateDayThemeWithOpenAiWithRaw({
        dayKey: "2026-02-05",
        recentThemesKo: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
