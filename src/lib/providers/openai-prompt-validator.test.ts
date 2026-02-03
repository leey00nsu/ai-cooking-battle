import { describe, expect, it, vi } from "vitest";

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: vi.fn(async () => ({
        output_text: '{"decision":"ALLOW","normalizedPrompt":"ok","category":"OK","fixGuide":""}',
      })),
    };
    constructor() {}
  }

  return { default: OpenAI };
});

import { validatePromptWithOpenAi } from "@/lib/providers/openai-prompt-validator";

describe("openai-prompt-validator", () => {
  it("parses allow response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_PROMPT_VALIDATION_MODEL", "gpt-5.2-mini");

    const result = await validatePromptWithOpenAi(" test ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedPrompt).toBe("ok");
    }
  });
});
