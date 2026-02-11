import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn(async () => ({
  output_text:
    '{"total":86.5,"themeFit":89,"execution":84,"oneLiner":"주제 맥락과 플레이팅 균형이 안정적인 결과입니다.","reasons":["주제 키워드와 재료 구성이 자연스럽게 연결됩니다.","접시 중심 구도와 색 대비가 명확합니다."],"tip":"주요 재료의 질감 대비를 조금 더 강조해 보세요."}',
}));

vi.mock("openai", () => {
  class OpenAI {
    responses = {
      create: responsesCreateMock,
    };
  }

  return { default: OpenAI };
});

import { generateDishScoreWithOpenAiWithRaw } from "@/lib/providers/openai-dish-score-generator";

const baseArgs = {
  themeText: "한겨울 캠핑 화롯가에 어울리는 숯불구이 요리",
  themeTextEn: "Charcoal-grilled dishes suitable for a winter campfire",
  axisAType: "장소" as const,
  axisA: "한겨울 캠핑 화롯가",
  axisBType: "조리법" as const,
  axisB: "숯불구이",
  axisFlavor: "훈연향",
  themeWeights: { A: 15, B: 55, F: 30 },
  themeSignals: {
    A: ["야외 분위기의 자연광"],
    B: ["숯불구이 형태의 메인 구성"],
    F: ["훈연된 갈색 그릴 마크"],
  },
  prompt: "겨울 캠핑 숯불 해산물 구이",
  promptEn: "charcoal grilled seafood for winter campfire",
  imageUrl: "https://cdn.example/dish.webp",
};

describe("openai-dish-score-generator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses dish score response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");

    const result = await generateDishScoreWithOpenAiWithRaw(baseArgs);

    expect(result.result.ok).toBe(true);
    expect(result.result.total).toBeGreaterThanOrEqual(0);
    expect(result.result.total).toBeLessThanOrEqual(100);
    expect(result.result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.result.tip.length).toBeGreaterThan(3);

    const request = ((
      responsesCreateMock as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.at(-1)?.[0] ?? {}) as {
      input?: Array<{
        content?: Array<{ type: string; text?: string; image_url?: string }>;
      }>;
    };
    const content = request.input?.[0]?.content ?? [];
    const textPart = content.find((item) => item.type === "input_text");
    const imagePart = content.find((item) => item.type === "input_image");
    expect(imagePart?.image_url).toBe("https://cdn.example/dish.webp");
    expect(textPart?.text).toBeTruthy();
    const payload = JSON.parse(textPart?.text ?? "{}") as Record<string, unknown>;
    expect(payload.axisAType).toBe("장소");
    expect(payload.axisBType).toBe("조리법");
    expect(payload.themeWeights).toEqual({ A: 15, B: 55, F: 30 });
  });

  it("throws when response JSON is invalid", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({ output_text: "not json" });

    await expect(generateDishScoreWithOpenAiWithRaw(baseArgs)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("throws when reasons count is out of range", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"total":86,"themeFit":90,"execution":82,"oneLiner":"평가 문장","reasons":["이유 하나만"],"tip":"팁 문장"}',
    });

    await expect(generateDishScoreWithOpenAiWithRaw(baseArgs)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("throws when score is out of range", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text:
        '{"total":120,"themeFit":90,"execution":82,"oneLiner":"평가 문장","reasons":["이유1","이유2"],"tip":"팁 문장"}',
    });

    await expect(generateDishScoreWithOpenAiWithRaw(baseArgs)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("throws when response exposes schema field names", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");
    responsesCreateMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        total: 58.5,
        themeFit: 38.8,
        execution: 88,
        oneLiner:
          "레몬을 얹은 홍차 사진은 완성도가 높지만 '허브 레몬 샐러드(주말 아침)' 테마와는 맞지 않습니다.",
        reasons: [
          "샐러드 신호가 전혀 보이지 않아 음식종류(axisB)에 부합하지 않습니다.",
          "상황(axisA) 매칭이 약합니다.",
        ],
        tip: "축별 시그널을 명확히 보여주세요.",
      }),
    });

    await expect(generateDishScoreWithOpenAiWithRaw(baseArgs)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("throws when theme metadata is invalid", async () => {
    vi.stubEnv("OPENAI_API_KEY", "key");
    vi.stubEnv("OPENAI_DISH_SCORE_MODEL", "gpt-5-mini");

    await expect(
      generateDishScoreWithOpenAiWithRaw({
        ...baseArgs,
        themeWeights: { A: 30, B: 30, F: 30 },
      }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
