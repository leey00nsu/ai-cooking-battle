import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validatePromptWithOpenAi } from "@/lib/providers/openai-prompt-validator";
import { ProviderError } from "@/lib/providers/provider-error";
import { checkRateLimit } from "@/lib/rate-limit/user-rate-limit";

export const runtime = "nodejs";

type ValidatePayload = {
  prompt?: string;
};

const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function sanitizePreview(value: string, maxLen = 120) {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLen ? `${singleLine.slice(0, maxLen)}…` : singleLine;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ValidatePayload;

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_REQUIRED",
        message: "Prompt is required.",
      },
      { status: 400 },
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const rateLimit = checkRateLimit({
    key: `create.validate:${userId}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `요청이 너무 많습니다. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    console.log("[create.validate] request", {
      promptLength: prompt.length,
      promptPreview: sanitizePreview(prompt),
    });

    const result = await validatePromptWithOpenAi(prompt);
    if (result.ok) {
      const warnings =
        result.warnings?.map((warning) => ({
          category: warning.category,
          message: sanitizePreview(warning.message, 160),
        })) ?? null;
      console.log("[create.validate] response", {
        ok: true,
        decision: result.decision,
        normalizedPromptLength: result.normalizedPrompt.length,
        normalizedPromptPreview: sanitizePreview(result.normalizedPrompt),
        warnings,
      });
      return NextResponse.json({
        ok: true,
        normalizedPrompt: result.normalizedPrompt,
      });
    }

    console.log("[create.validate] response", {
      ok: false,
      decision: result.decision,
      category: result.category,
      fixGuide: result.fixGuide,
      normalizedPromptLength: result.normalizedPrompt?.length ?? null,
      normalizedPromptPreview: result.normalizedPrompt
        ? sanitizePreview(result.normalizedPrompt)
        : null,
    });

    return NextResponse.json({
      ok: false,
      code: "PROMPT_BLOCKED",
      message: result.fixGuide,
      category: result.category,
      fixGuide: result.fixGuide,
      normalizedPrompt: result.normalizedPrompt ?? null,
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.warn("[create.validate] provider error", {
        provider: error.provider,
        code: error.code,
        status: error.status ?? null,
        message: error.message,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_UNAVAILABLE",
          message: "검증 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
