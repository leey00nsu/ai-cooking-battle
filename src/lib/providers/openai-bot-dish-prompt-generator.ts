import OpenAI from "openai";
import { getOpenAiBotDishPromptInstructions } from "@/lib/prompts/prompt-templates";
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
    model: process.env.OPENAI_BOT_DISH_PROMPT_MODEL?.trim() || "gpt-5-mini",
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

function validateGenerationPromptEn(value: string) {
  const candidate = normalizeSingleLine(value);
  if (!candidate) {
    return null;
  }
  return candidate;
}

function validateDishName(value: string, personaDisplayName: string) {
  const candidate = normalizeSingleLine(value);
  if (!candidate) {
    return null;
  }
  if (candidate.length < 2 || candidate.length > 40) {
    return null;
  }
  if (/[,:.;!?()[\]{}]/.test(candidate)) {
    return null;
  }
  if (/\d/.test(candidate)) {
    return null;
  }
  const lower = candidate.toLowerCase();
  if (
    lower.includes("close-up") ||
    lower.includes("natural lighting") ||
    lower.includes("sharp focus") ||
    lower.includes("simple background")
  ) {
    return null;
  }
  const normalizedPersona = normalizeSingleLine(personaDisplayName);
  if (normalizedPersona && lower.includes(normalizedPersona.toLowerCase())) {
    return null;
  }
  return candidate;
}

function validateDishNameEn(value: string) {
  const candidate = normalizeSingleLine(value);
  if (!candidate) {
    return null;
  }
  if (candidate.length < 2 || candidate.length > 120) {
    return null;
  }
  return candidate;
}

export type BotDishPromptRaw = {
  model: string;
  openAiResponseId: string | null;
  outputText: string;
  outputJson: unknown;
};

export type BotDishPromptResult = {
  ok: true;
  dishName: string;
  dishNameEn: string;
  dishPromptEn: string;
};

export type BotDishPromptWithRaw = {
  result: BotDishPromptResult;
  raw: BotDishPromptRaw;
};

export async function generateBotDishPromptWithOpenAiWithRaw(args: {
  themeText: string;
  themeTextEn: string;
  personaDisplayName: string;
  personaStylePrompt: string;
}): Promise<BotDishPromptWithRaw> {
  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const instructions = getOpenAiBotDishPromptInstructions();

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: JSON.stringify({
      themeTextKo: args.themeText,
      themeTextEn: args.themeTextEn,
      personaDisplayName: args.personaDisplayName,
      personaStylePrompt: args.personaStylePrompt,
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
      message: "[openai] Failed to parse JSON output for bot dish prompt.",
      cause: error,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid JSON output for bot dish prompt.",
    });
  }

  const record = parsed as Record<string, unknown>;
  const dishName = validateDishName(String(record.dishName ?? ""), args.personaDisplayName);
  const dishNameEn = validateDishNameEn(String(record.dishNameEn ?? ""));
  const dishPromptEn = validateGenerationPromptEn(String(record.dishPromptEn ?? ""));
  if (!dishName || !dishNameEn || !dishPromptEn) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] bot dish prompt JSON did not match schema/constraints.",
    });
  }

  return {
    result: { ok: true, dishName, dishNameEn, dishPromptEn },
    raw: {
      model: config.model,
      openAiResponseId: response.id?.toString() ?? null,
      outputText,
      outputJson: parsed,
    },
  };
}

export async function generateBotDishPromptWithOpenAi(args: {
  themeText: string;
  themeTextEn: string;
  personaDisplayName: string;
  personaStylePrompt: string;
}): Promise<BotDishPromptResult> {
  const { result } = await generateBotDishPromptWithOpenAiWithRaw(args);
  return result;
}
