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

export async function generateDishScoreWithOpenAiWithRaw(args: {
  themeText: string;
  themeTextEn: string;
  prompt: string;
  promptEn?: string | null;
  imageUrl: string;
}): Promise<DishScoreWithRaw> {
  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const instructions = getOpenAiDishScoreInstructions();

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: JSON.stringify({
      themeTextKo: args.themeText,
      themeTextEn: args.themeTextEn,
      dishPromptKo: args.prompt,
      dishPromptEn: args.promptEn ?? "",
      imageUrl: args.imageUrl,
    }),
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
  prompt: string;
  promptEn?: string | null;
  imageUrl: string;
}): Promise<DishScoreResult> {
  const { result } = await generateDishScoreWithOpenAiWithRaw(args);
  return result;
}
