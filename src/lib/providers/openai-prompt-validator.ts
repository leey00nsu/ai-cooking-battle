import OpenAI from "openai";
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

export async function validatePromptWithOpenAi(prompt: string): Promise<PromptValidationResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, decision: "BLOCK", category: "EMPTY", fixGuide: "프롬프트를 입력하세요." };
  }

  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });

  const instructions = [
    "You validate user prompts for an AI cooking image generation app.",
    "The final generated image must be a single plated dish photo: food on a plate.",
    "You must follow the product policy below and return a decision.",
    "",
    "Policy (minimum):",
    "- PROHIBITED (must BLOCK):",
    "  - non-food / off-topic content (cannot reasonably produce a single plated dish photo: food on a plate)",
    "  - child sexual content / sexual content involving minors",
    "  - explicit sexual content",
    "  - excessive graphic violence / gore",
    "  - hate / discrimination incitement",
    "  - illegal wrongdoing instructions or facilitation",
    "  - sexual deepfake / sexual depiction of a real person",
    "  - clear copyright infringement (e.g., exact protected characters/logos/style replication request)",
    "- GRAY ZONE (ALLOW but warn):",
    "  - mild violence, suggestive sexual content, potential hate/harassment, possible copyright issues, real-person depiction request (non-sexual).",
    "",
    "Return ONLY a JSON object that matches this schema:",
    "{",
    '  "decision": "ALLOW" | "BLOCK",',
    '  "normalizedPrompt": string,',
    `  "category": ${JSON.stringify([
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
    ])},`,
    '  "fixGuide": string,',
    '  "isGray": boolean',
    "}",
    'If decision is "ALLOW": set category="OK" and fixGuide="".',
    'If decision is "BLOCK": category must be a value from the list above (not free-form) and fixGuide must be Korean.',
    'If the prompt is non-food / off-topic: set decision="BLOCK", category="NON_FOOD", and fixGuide must ask for a plated-dish prompt (food on a plate).',
    'If the prompt is GRAY ZONE: set decision="ALLOW", isGray=true, category="GRAY", and put a short Korean caution in fixGuide.',
    "When blocking or warning, the fixGuide should suggest a safe alternative that results in a single plated dish photo.",
    "The fixGuide should nudge users to include: dish name, ingredients, plating on a plate, camera angle, lighting, simple background.",
    "Normalize whitespace in normalizedPrompt; keep meaning.",
  ].join("\n");

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

  const record = parsed as Record<string, unknown>;
  const decision = String(record.decision ?? "").toUpperCase();
  const normalizedPrompt = String(record.normalizedPrompt ?? "").trim() || trimmed;
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

  const allowedCategories: PromptValidationCategory[] = [
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
  const safeCategory = allowedCategories.includes(category as PromptValidationCategory)
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
