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

export type PromptValidationResult =
  | { ok: true; decision: "ALLOW"; normalizedPrompt: string }
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
    "Return ONLY a JSON object that matches this schema:",
    "{",
    '  "decision": "ALLOW" | "BLOCK",',
    '  "normalizedPrompt": string,',
    '  "category": string,',
    '  "fixGuide": string',
    "}",
    'If decision is "ALLOW": set category="OK" and fixGuide="".',
    'If decision is "BLOCK": provide a short category and a Korean fixGuide to help the user rewrite safely.',
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
  const category = String(record.category ?? "").trim() || "UNKNOWN";
  const fixGuide = String(record.fixGuide ?? "").trim();

  if (decision !== "ALLOW" && decision !== "BLOCK") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid decision.",
    });
  }

  if (decision === "ALLOW") {
    return { ok: true, decision: "ALLOW", normalizedPrompt };
  }

  return {
    ok: false,
    decision: "BLOCK",
    category,
    fixGuide: fixGuide || "프롬프트를 안전하게 다시 작성해 주세요.",
    normalizedPrompt,
  };
}
