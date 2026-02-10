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

export type DayThemeResult = {
  ok: true;
  themeText: string;
  themeTextEn: string;
  axisAType: "상황" | "장소" | "분위기";
  axisA: string;
  axisBType: "음식종류" | "특정재료" | "조리법";
  axisB: string;
  axisFlavor: string;
};

export type DayThemeWithRaw = {
  result: DayThemeResult;
  raw: DayThemeRaw;
};

function normalizeSingleLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
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
  return candidate;
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

  if (!themeText || !themeTextEn || !axisAType || !axisA || !axisBType || !axisB || !axisFlavor) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Day theme JSON did not match schema/constraints.",
    });
  }

  return {
    result: { ok: true, themeText, themeTextEn, axisAType, axisA, axisBType, axisB, axisFlavor },
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
