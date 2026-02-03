import OpenAI from "openai";
import { getOpenAiPromptValidationInstructions } from "@/lib/prompts/prompt-templates";
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
    model: process.env.OPENAI_PROMPT_VALIDATION_MODEL?.trim() || "gpt-5.2-mini",
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

export type PromptValidationDecision = "ALLOW" | "BLOCK";

type PromptValidationCategory =
  | "OK"
  | "EMPTY"
  | "NON_FOOD"
  | "CHILD_SEXUAL"
  | "SEXUAL_EXPLICIT"
  | "VIOLENCE_GRAPHIC"
  | "HATE"
  | "ILLEGAL"
  | "REAL_PERSON"
  | "REAL_PERSON_SEXUAL"
  | "COPYRIGHT_CLEAR"
  | "COPYRIGHT_SUSPECTED"
  | "GRAY"
  | "OTHER";

export type PromptValidationWarning = {
  category: string;
  message: string;
};

export type PromptValidationResult =
  | { ok: true; decision: "ALLOW"; normalizedPrompt: string; warnings?: PromptValidationWarning[] }
  | {
      ok: false;
      decision: "BLOCK";
      category: string;
      fixGuide: string;
      normalizedPrompt?: string;
    };

const PROMPT_VALIDATION_CATEGORIES: PromptValidationCategory[] = [
  "OK",
  "EMPTY",
  "NON_FOOD",
  "CHILD_SEXUAL",
  "SEXUAL_EXPLICIT",
  "VIOLENCE_GRAPHIC",
  "HATE",
  "ILLEGAL",
  "REAL_PERSON",
  "REAL_PERSON_SEXUAL",
  "COPYRIGHT_CLEAR",
  "COPYRIGHT_SUSPECTED",
  "GRAY",
  "OTHER",
];

export type PromptValidationRaw = {
  model: string;
  openAiResponseId: string | null;
  outputText: string;
  outputJson: unknown;
};

type PromptValidationWithRaw = {
  result: PromptValidationResult;
  raw: PromptValidationRaw;
};

async function callOpenAiForPromptValidation(
  prompt: string,
): Promise<{ raw: PromptValidationRaw; record: Record<string, unknown> }> {
  const trimmed = prompt.trim();
  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });

  const instructions = getOpenAiPromptValidationInstructions({
    PROMPT_VALIDATION_CATEGORIES_JSON: JSON.stringify(PROMPT_VALIDATION_CATEGORIES),
  });

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: trimmed,
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
      message: "[openai] Failed to parse JSON output.",
      cause: error,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid JSON output.",
    });
  }

  return {
    raw: {
      model: config.model,
      openAiResponseId: (response as { id?: string | null })?.id?.toString() ?? null,
      outputText,
      outputJson: parsed,
    },
    record: parsed as Record<string, unknown>,
  };
}

function toPromptValidationResult(
  trimmedPrompt: string,
  record: Record<string, unknown>,
): PromptValidationResult {
  const decision = String(record.decision ?? "").toUpperCase();
  const normalizedPrompt = String(record.normalizedPrompt ?? "").trim() || trimmedPrompt;
  const category = String(record.category ?? "").trim() || "OTHER";
  const fixGuide = String(record.fixGuide ?? "").trim();
  const isGray = Boolean(record.isGray);

  if (decision !== "ALLOW" && decision !== "BLOCK") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid decision.",
    });
  }

  if (decision === "ALLOW") {
    const warnings: PromptValidationWarning[] = [];
    if (isGray || category === "GRAY") {
      warnings.push({
        category: "GRAY",
        message: fixGuide || "회색지대 콘텐츠로 판단될 수 있습니다. 안전한 표현으로 조정해 주세요.",
      });
    }
    return warnings.length
      ? { ok: true, decision: "ALLOW", normalizedPrompt, warnings }
      : { ok: true, decision: "ALLOW", normalizedPrompt };
  }

  const safeCategory = PROMPT_VALIDATION_CATEGORIES.includes(category as PromptValidationCategory)
    ? category
    : "OTHER";

  return {
    ok: false,
    decision: "BLOCK",
    category: safeCategory,
    fixGuide:
      fixGuide ||
      (safeCategory === "NON_FOOD"
        ? "접시 위에 올라간 음식 사진이 나오도록, 요리/재료/플레이팅(접시), 촬영 각도/조명 등을 포함해 다시 작성해 주세요."
        : "접시 위에 올라간 음식 사진이 나오도록 안전하게 다시 작성해 주세요."),
    normalizedPrompt,
  };
}

export async function validatePromptWithOpenAiWithRaw(
  prompt: string,
): Promise<PromptValidationWithRaw> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      result: {
        ok: false,
        decision: "BLOCK",
        category: "EMPTY",
        fixGuide: "프롬프트를 입력하세요.",
      },
      raw: {
        model: process.env.OPENAI_PROMPT_VALIDATION_MODEL?.trim() || "gpt-5.2-mini",
        openAiResponseId: null,
        outputText: "",
        outputJson: { decision: "BLOCK", category: "EMPTY" },
      },
    };
  }

  const { raw, record } = await callOpenAiForPromptValidation(trimmed);
  const result = toPromptValidationResult(trimmed, record);
  return { result, raw };
}

export async function validatePromptWithOpenAi(prompt: string): Promise<PromptValidationResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, decision: "BLOCK", category: "EMPTY", fixGuide: "프롬프트를 입력하세요." };
  }

  const { record } = await callOpenAiForPromptValidation(trimmed);
  return toPromptValidationResult(trimmed, record);
}
