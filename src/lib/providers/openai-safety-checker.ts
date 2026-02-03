import OpenAI from "openai";
import { getOpenAiImageSafetyInstructions } from "@/lib/prompts/prompt-templates";
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
    model: process.env.OPENAI_SAFETY_CHECK_MODEL?.trim() || "gpt-5.2-mini",
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

export type SafetyCheckResult =
  | { ok: true }
  | {
      ok: false;
      category: SafetyBlockCategory;
      reason: string;
    };

type SafetyBlockCategory = "POLICY" | "NON_FOOD" | "OTHER";

export type SafetyCheckRaw = {
  model: string;
  openAiResponseId: string | null;
  outputText: string;
  outputJson: unknown;
};

type SafetyCheckWithRaw = {
  result: SafetyCheckResult;
  raw: SafetyCheckRaw;
};

function toSafetyResult(rawOutput: unknown): SafetyCheckResult {
  if (!rawOutput || typeof rawOutput !== "object") {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] Invalid JSON output for safety check.",
    });
  }

  const record = rawOutput as Record<string, unknown>;
  const decision = String(record.decision ?? "").toUpperCase();
  const categoryRaw = String(record.category ?? "")
    .trim()
    .toUpperCase();
  const reason = String(record.reason ?? "").trim();

  if (decision === "ALLOW") {
    return { ok: true };
  }

  const category: SafetyBlockCategory =
    categoryRaw === "NON_FOOD" ? "NON_FOOD" : categoryRaw === "POLICY" ? "POLICY" : "OTHER";

  return {
    ok: false,
    category,
    reason: reason || "안전 정책에 따라 해당 이미지는 표시할 수 없습니다.",
  };
}

export async function checkImageSafetyWithOpenAiWithRaw(args: {
  prompt: string;
  imageUrl: string;
}): Promise<SafetyCheckWithRaw> {
  const prompt = args.prompt.trim();
  const imageUrl = args.imageUrl.trim();
  if (!prompt || !imageUrl) {
    throw new ProviderError({
      provider: PROVIDER,
      code: "INVALID_RESPONSE",
      message: "[openai] prompt and imageUrl are required for safety check.",
    });
  }

  const config = getOpenAiConfig();
  const client = new OpenAI({ apiKey: config.apiKey });

  const instructions = getOpenAiImageSafetyInstructions();

  const response = await client.responses.create({
    model: config.model,
    instructions,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `User prompt: ${prompt}` },
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
      message: "[openai] Failed to parse JSON output for safety check.",
      cause: error,
    });
  }

  const result = toSafetyResult(parsed);
  return {
    result,
    raw: {
      model: config.model,
      openAiResponseId: (response as { id?: string | null })?.id?.toString() ?? null,
      outputText,
      outputJson: parsed,
    },
  };
}

export async function checkImageSafetyWithOpenAi(args: {
  prompt: string;
  imageUrl: string;
}): Promise<SafetyCheckResult> {
  const { result } = await checkImageSafetyWithOpenAiWithRaw(args);
  return result;
}
