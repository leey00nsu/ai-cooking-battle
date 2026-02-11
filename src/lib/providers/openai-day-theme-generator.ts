import OpenAI from "openai";
import { getOpenAiDayThemeInstructions } from "@/lib/prompts/prompt-templates";
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
    model: process.env.OPENAI_DAY_THEME_MODEL?.trim() || "gpt-5-mini",
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

export type DayThemeRaw = {
  model: string;
  openAiResponseId: string | null;
  outputText: string;
  outputJson: unknown;
};

export type DayThemeWeights = {
  A: number;
  B: number;
  F: number;
};

export type DayThemeSignals = {
  A: string[];
  B: string[];
  F: string[];
};

export type DayThemeResult = {
  ok: true;
  themeText: string;
  themeTextEn: string;
  axisAType: "상황" | "장소" | "분위기";
  axisA: string;
  axisBType: "음식종류" | "특정재료" | "조리법";
  axisB: string;
  axisFlavor: string;
  themeWeights: DayThemeWeights;
  themeSignals: DayThemeSignals;
};

export type DayThemeWithRaw = {
  result: DayThemeResult;
  raw: DayThemeRaw;
};

function normalizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const EXPOSED_SCHEMA_TOKEN_PATTERNS = [
  /\bthemeText\b/i,
  /\bthemeTextEn\b/i,
  /\baxisAType\b/i,
  /\baxisA\b/i,
  /\baxisBType\b/i,
  /\baxisB\b/i,
  /\baxisFlavor\b/i,
  /\bthemeWeights\b/i,
  /\bthemeSignals\b/i,
];

function includesExposedSchemaToken(value: string) {
  return EXPOSED_SCHEMA_TOKEN_PATTERNS.some((pattern) => pattern.test(value));
}

function validateThemeText(themeText: string) {
  const candidate = normalizeSingleLine(themeText);
  if (!candidate) {
    return null;
  }
  if (candidate.includes("\n")) {
    return null;
  }
  if (!candidate.includes("에 어울리는")) {
    return null;
  }
  if (!candidate.includes("풍미의 음식")) {
    return null;
  }
  if (candidate.length < 12 || candidate.length > 100) {
    return null;
  }
  if (includesExposedSchemaToken(candidate)) {
    return null;
  }
  return candidate;
}

function validateThemeTextEn(themeTextEn: string) {
  const candidate = normalizeSingleLine(themeTextEn);
  if (!candidate) {
    return null;
  }
  if (candidate.length < 4 || candidate.length > 160) {
    return null;
  }
  if (includesExposedSchemaToken(candidate)) {
    return null;
  }
  return candidate;
}

const AXIS_A_TYPES = ["상황", "장소", "분위기"] as const;
const AXIS_B_TYPES = ["음식종류", "특정재료", "조리법"] as const;

function validateAxisAType(value: string): DayThemeResult["axisAType"] | null {
  return AXIS_A_TYPES.includes(value as DayThemeResult["axisAType"])
    ? (value as DayThemeResult["axisAType"])
    : null;
}

function validateAxisBType(value: string): DayThemeResult["axisBType"] | null {
  return AXIS_B_TYPES.includes(value as DayThemeResult["axisBType"])
    ? (value as DayThemeResult["axisBType"])
    : null;
}

function validateAxisText(value: string, maxLen: number) {
  const candidate = normalizeSingleLine(value);
  if (!candidate) {
    return null;
  }
  if (candidate.length < 1 || candidate.length > maxLen) {
    return null;
  }
  if (candidate.includes(",")) {
    return null;
  }
  if (includesExposedSchemaToken(candidate)) {
    return null;
  }
  return candidate;
}

function validateWeightNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0 || value > 100) {
    return null;
  }

  return value;
}

function validateThemeWeights(value: unknown): DayThemeWeights | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const A = validateWeightNumber(record.A);
  const B = validateWeightNumber(record.B);
  const F = validateWeightNumber(record.F);
  if (A === null || B === null || F === null) {
    return null;
  }

  const sum = A + B + F;
  if (Math.abs(sum - 100) > 0.001) {
    return null;
  }

  return { A, B, F };
}

function validateSignalArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? normalizeSingleLine(item) : ""))
    .filter(Boolean);

  if (normalized.length < 1 || normalized.length > 3) {
    return null;
  }

  if (normalized.some((item) => item.length > 60)) {
    return null;
  }
  if (normalized.some((item) => includesExposedSchemaToken(item))) {
    return null;
  }

  return normalized;
}

function validateThemeSignals(value: unknown): DayThemeSignals | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const A = validateSignalArray(record.A);
  const B = validateSignalArray(record.B);
  const F = validateSignalArray(record.F);
  if (!A || !B || !F) {
    return null;
  }

  return { A, B, F };
}

export async function generateDayThemeWithOpenAiWithRaw(args: {
  dayKey: string;
  recentThemesKo: string[];
}): Promise<DayThemeWithRaw> {
  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });

  const instructions = getOpenAiDayThemeInstructions({
    RECENT_THEMES_KO_JSON: JSON.stringify(args.recentThemesKo.slice(0, 14)),
  });

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: `dayKey(KST): ${args.dayKey}`,
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
      message: "[openai] Failed to parse JSON output for day theme.",
      cause: error,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid JSON output for day theme.",
    });
  }

  const record = parsed as Record<string, unknown>;
  const themeText = validateThemeText(String(record.themeText ?? ""));
  const themeTextEn = validateThemeTextEn(String(record.themeTextEn ?? ""));
  const axisAType = validateAxisAType(String(record.axisAType ?? ""));
  const axisA = validateAxisText(String(record.axisA ?? ""), 30);
  const axisBType = validateAxisBType(String(record.axisBType ?? ""));
  const axisB = validateAxisText(String(record.axisB ?? ""), 30);
  const axisFlavor = validateAxisText(String(record.axisFlavor ?? ""), 30);
  const themeWeights = validateThemeWeights(record.themeWeights);
  const themeSignals = validateThemeSignals(record.themeSignals);

  if (
    !themeText ||
    !themeTextEn ||
    !axisAType ||
    !axisA ||
    !axisBType ||
    !axisB ||
    !axisFlavor ||
    !themeWeights ||
    !themeSignals
  ) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Day theme JSON did not match schema/constraints.",
    });
  }

  return {
    result: {
      ok: true,
      themeText,
      themeTextEn,
      axisAType,
      axisA,
      axisBType,
      axisB,
      axisFlavor,
      themeWeights,
      themeSignals,
    },
    raw: {
      model: config.model,
      openAiResponseId: (response as { id?: string | null })?.id?.toString() ?? null,
      outputText,
      outputJson: parsed,
    },
  };
}

export async function generateDayThemeWithOpenAi(args: {
  dayKey: string;
  recentThemesKo: string[];
}): Promise<DayThemeResult> {
  const { result } = await generateDayThemeWithOpenAiWithRaw(args);
  return result;
}
