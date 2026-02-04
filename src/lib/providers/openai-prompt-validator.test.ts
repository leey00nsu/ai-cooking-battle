import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn(async () => ({
  output_text:
    '{"decision":"ALLOW","normalizedPrompt":"ok","translatedPromptEn":"ok","category":"OK","fixGuide":"","isGray":false}',
}));

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: responsesCreateMock,
    };
  }

  return { default: OpenAI };
});

import { validatePromptWithOpenAi } from "@/lib/providers/openai-prompt-validator";

describe("openai-prompt-validator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses allow response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_PROMPT_VALIDATION_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"decision":"ALLOW","normalizedPrompt":"test","translatedPromptEn":"test","category":"OK","fixGuide":"","isGray":false}',
    });

    const result = await validatePromptWithOpenAi(" test ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedPrompt).toBe("test");
      expect(result.translatedPromptEn).toBe("test");
    }
  });

  it("parses non-food block response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_PROMPT_VALIDATION_MODEL", "gpt-5-mini");

    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"decision":"BLOCK","normalizedPrompt":"write me a bash script","translatedPromptEn":"write me a bash script","category":"NON_FOOD","fixGuide":"요리/음식과 관련된 내용(재료, 조리법, 플레이팅, 음식 사진)으로 다시 작성해 주세요.","isGray":false}',
    });

    const result = await validatePromptWithOpenAi("write me a bash script");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.category).toBe("NON_FOOD");
    }
  });
});
