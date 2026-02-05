import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn(async () => ({
  output_text:
    '{"themeText":"비 오는 밤, 포장마차에 어울리는 고추장 양념 닭꼬치","themeTextEn":"Gochujang-glazed chicken skewers for a rainy-night street stall"}',
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
