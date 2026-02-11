import OpenAI from "openai";
import { getOpenAiDishScoreInstructions } from "@/lib/prompts/prompt-templates";
import { ProviderError } from "@/lib/providers/provider-error";

const PROVIDER = "openai";

type OpenAiConfig = {
  apiKey: string;
  model: string;
};

function getOpenAiConfig(): OpenAiConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "MISSING_ENV",
      message: "[openai] Missing OPENAI_API_KEY.",
    });
  }

  return {
    apiKey,
    model: process.env.OPENAI_DISH_SCORE_MODEL?.trim() || "gpt-5-mini",
  };
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function normalizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseScore(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < 0 || parsed > 100) {
    return null;
  }
  return parsed;
}

function parseShortText(value: unknown, maxLen: number) {
  const normalized = normalizeSingleLine(String(value ?? ""));
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLen) {
    return null;
  }
  return normalized;
}

function parseReasons(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const reasons = value
    .map((item) => parseShortText(item, 200))
    .filter((item): item is string => Boolean(item));
  if (reasons.length < 2 || reasons.length > 3) {
    return null;
  }
  return reasons;
}

export type DishScoreAxisAType = "상황" | "장소" | "분위기";
export type DishScoreAxisBType = "음식종류" | "특정재료" | "조리법";

export type DishScoreThemeWeights = {
  A: number;
  B: number;
  F: number;
};

export type DishScoreThemeSignals = {
  A: string[];
  B: string[];
  F: string[];
};

export type DishScoreRaw = {
  model: string;
  openAiResponseId: string | null;
  outputText: string;
  outputJson: unknown;
};

export type DishScoreResult = {
  ok: true;
  total: number;
  themeFit: number;
  execution: number;
  oneLiner: string;
  reasons: string[];
  tip: string;
};

export type DishScoreWithRaw = {
  result: DishScoreResult;
  raw: DishScoreRaw;
};

function parseAxisAType(value: unknown): DishScoreAxisAType | null {
  const normalized = normalizeSingleLine(String(value ?? ""));
  if (normalized === "상황" || normalized === "장소" || normalized === "분위기") {
    return normalized;
  }
  return null;
}

function parseAxisBType(value: unknown): DishScoreAxisBType | null {
  const normalized = normalizeSingleLine(String(value ?? ""));
  if (normalized === "음식종류" || normalized === "특정재료" || normalized === "조리법") {
    return normalized;
  }
  return null;
}

function parseThemeWeights(value: unknown): DishScoreThemeWeights | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const A = parseScore(record.A);
  const B = parseScore(record.B);
  const F = parseScore(record.F);
  if (A === null || B === null || F === null) {
    return null;
  }
  if (Math.abs(A + B + F - 100) > 0.001) {
    return null;
  }
  return { A, B, F };
}

function parseThemeSignalList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed = value
    .map((item) => parseShortText(item, 80))
    .filter((item): item is string => !!item);
  if (parsed.length < 1 || parsed.length > 3) {
    return null;
  }
  return parsed;
}

function parseThemeSignals(value: unknown): DishScoreThemeSignals | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const A = parseThemeSignalList(record.A);
  const B = parseThemeSignalList(record.B);
  const F = parseThemeSignalList(record.F);
  if (!A || !B || !F) {
    return null;
  }
  return { A, B, F };
}

export async function generateDishScoreWithOpenAiWithRaw(args: {
  themeText: string;
  themeTextEn: string;
  axisAType: DishScoreAxisAType;
  axisA: string;
  axisBType: DishScoreAxisBType;
  axisB: string;
  axisFlavor: string;
  themeWeights: DishScoreThemeWeights;
  themeSignals: DishScoreThemeSignals;
  prompt: string;
  promptEn?: string | null;
  imageUrl: string;
}): Promise<DishScoreWithRaw> {
  const themeText = parseShortText(args.themeText, 160);
  const themeTextEn = parseShortText(args.themeTextEn, 220);
  const axisAType = parseAxisAType(args.axisAType);
  const axisA = parseShortText(args.axisA, 40);
  const axisBType = parseAxisBType(args.axisBType);
  const axisB = parseShortText(args.axisB, 40);
  const axisFlavor = parseShortText(args.axisFlavor, 40);
  const themeWeights = parseThemeWeights(args.themeWeights);
  const themeSignals = parseThemeSignals(args.themeSignals);
  const dishPromptKo = parseShortText(args.prompt, 280);
  const dishPromptEn = parseShortText(args.promptEn ?? "", 900) ?? "";
  const imageUrl = parseShortText(args.imageUrl, 1_500);

  if (
    !themeText ||
    !themeTextEn ||
    !axisAType ||
    !axisA ||
    !axisBType ||
    !axisB ||
    !axisFlavor ||
    !themeWeights ||
    !themeSignals ||
    !dishPromptKo ||
    !imageUrl
  ) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] dish score input did not match schema/constraints.",
    });
  }

  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const instructions = getOpenAiDishScoreInstructions();

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              themeTextKo: themeText,
              themeTextEn,
              axisAType,
              axisA,
              axisBType,
              axisB,
              axisFlavor,
              themeWeights,
              themeSignals,
              dishPromptKo,
              dishPromptEn,
              imageUrl,
            }),
          },
          { type: "input_image", image_url: imageUrl, detail: "auto" },
        ],
      },
    ],
  });

  const outputText = (response.output_text ?? "").trim();
  const jsonText = extractFirstJsonObject(outputText) ?? outputText;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Failed to parse JSON output for dish score.",
      cause: error,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid JSON output for dish score.",
    });
  }

  const record = parsed as Record<string, unknown>;
  const total = parseScore(record.total);
  const themeFit = parseScore(record.themeFit);
  const execution = parseScore(record.execution);
  const oneLiner = parseShortText(record.oneLiner, 220);
  const reasons = parseReasons(record.reasons);
  const tip = parseShortText(record.tip, 220);

  if (total === null || themeFit === null || execution === null || !oneLiner || !reasons || !tip) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] dish score JSON did not match schema/constraints.",
    });
  }

  return {
    result: { ok: true, total, themeFit, execution, oneLiner, reasons, tip },
    raw: {
      model: config.model,
      openAiResponseId: response.id?.toString() ?? null,
      outputText,
      outputJson: parsed,
    },
  };
}

export async function generateDishScoreWithOpenAi(args: {
  themeText: string;
  themeTextEn: string;
  axisAType: DishScoreAxisAType;
  axisA: string;
  axisBType: DishScoreAxisBType;
  axisB: string;
  axisFlavor: string;
  themeWeights: DishScoreThemeWeights;
  themeSignals: DishScoreThemeSignals;
  prompt: string;
  promptEn?: string | null;
  imageUrl: string;
}): Promise<DishScoreResult> {
  const { result } = await generateDishScoreWithOpenAiWithRaw(args);
  return result;
}
