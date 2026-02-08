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

function validateDishPromptEn(value: string) {
  const candidate = normalizeSingleLine(value);
  if (!candidate) {
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
  const dishPromptEn = validateDishPromptEn(String(record.dishPromptEn ?? ""));
  if (!dishPromptEn) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] bot dish prompt JSON did not match schema/constraints.",
    });
  }

  return {
    result: { ok: true, dishPromptEn },
    raw: {
      model: config.model,
      openAiResponseId: (response as { id?: string | null })?.id?.toString() ?? null,
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
