import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn(async () => ({
  output_text:
    '{"dishPrompt":"겨울 캠핑 화롯가 숯불 해산물 꼬치","dishPromptEn":"charcoal-grilled skewers with smoky glaze, winter campsite hearth mood, molecular garnish accents"}',
}));

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: responsesCreateMock,
    };
  }

  return { default: OpenAI };
});

import { generateBotDishPromptWithOpenAiWithRaw } from "@/lib/providers/openai-bot-dish-prompt-generator";

describe("openai-bot-dish-prompt-generator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses bot dish prompt response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_BOT_DISH_PROMPT_MODEL", "gpt-5-mini");

    const result = await generateBotDishPromptWithOpenAiWithRaw({
      themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
      themeTextEn: "Charcoal-grilled dish for a midwinter camping campfire",
      personaDisplayName: "크레이지 테크니션",
      personaStylePrompt:
        "molecular gastronomy visuals, aromatic foam, transparent gel spheres, unexpected textures, futuristic plating with controlled chaos",
    });

    expect(result.result.ok).toBe(true);
    expect(result.result.dishPrompt.length).toBeGreaterThan(4);
    expect(result.result.dishPromptEn.length).toBeGreaterThan(16);
  });

  it("throws when response JSON is invalid", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_BOT_DISH_PROMPT_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({ output_text: "not json" });

    await expect(
      generateBotDishPromptWithOpenAiWithRaw({
        themeText: "theme",
        themeTextEn: "theme",
        personaDisplayName: "persona",
        personaStylePrompt: "style",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("throws when dishPrompt includes persona display name", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_BOT_DISH_PROMPT_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"dishPrompt":"크레이지 테크니션의 겨울 캠핑 요리","dishPromptEn":"charcoal-grilled seafood salad with bright winter garnish and molecular accents"}',
    });

    await expect(
      generateBotDishPromptWithOpenAiWithRaw({
        themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
        themeTextEn: "Charcoal-grilled dish for a midwinter camping campfire",
        personaDisplayName: "크레이지 테크니션",
        personaStylePrompt: "molecular style",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("throws when dishPrompt is sentence-like with punctuation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_BOT_DISH_PROMPT_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"dishPrompt":"한겨울 캠핑에 어울리는 숯불 해산물 샐러드.","dishPromptEn":"charcoal-grilled seafood salad with winter campfire mood"}',
    });

    await expect(
      generateBotDishPromptWithOpenAiWithRaw({
        themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
        themeTextEn: "Charcoal-grilled dish for a midwinter camping campfire",
        personaDisplayName: "크레이지 테크니션",
        personaStylePrompt: "molecular style",
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
