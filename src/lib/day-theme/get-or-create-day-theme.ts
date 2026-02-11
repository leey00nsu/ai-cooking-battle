import { prisma } from "@/lib/prisma";
import {
  type DayThemeSignals,
  type DayThemeWeights,
  generateDayThemeWithOpenAiWithRaw,
} from "@/lib/providers/openai-day-theme-generator";
import { ProviderError } from "@/lib/providers/provider-error";

type FallbackDayTheme = {
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

const DEFAULT_THEME_WEIGHTS: DayThemeWeights = {
  A: 15,
  B: 55,
  F: 30,
};

const DEFAULT_THEME_SIGNALS: DayThemeSignals = {
  A: ["일상 상황이 느껴지는 간단한 상차림"],
  B: ["요리 형태가 주제 축과 일치"],
  F: ["풍미를 드러내는 재료 포인트"],
};

function cloneThemeWeights(weights: DayThemeWeights): DayThemeWeights {
  return { A: weights.A, B: weights.B, F: weights.F };
}

function cloneThemeSignals(signals: DayThemeSignals): DayThemeSignals {
  return { A: [...signals.A], B: [...signals.B], F: [...signals.F] };
}

const FALLBACK_THEMES: FallbackDayTheme[] = [
  {
    themeText: "비 오는 밤에 어울리는 닭꼬치 매콤한 풍미의 음식",
    themeTextEn: "A dish with spicy-flavored chicken skewers suitable for a rainy night",
    axisAType: "상황",
    axisA: "비 오는 밤",
    axisBType: "특정재료",
    axisB: "닭꼬치",
    axisFlavor: "고추장 양념",
    themeWeights: DEFAULT_THEME_WEIGHTS,
    themeSignals: DEFAULT_THEME_SIGNALS,
  },
  {
    themeText: "봄 소풍 공원에 어울리는 디저트 상큼한 풍미의 음식",
    themeTextEn: "A dish with refreshing-flavored dessert suitable for a spring picnic park",
    axisAType: "장소",
    axisA: "공원",
    axisBType: "특정재료",
    axisB: "딸기와 요거트",
    axisFlavor: "상큼한",
    themeWeights: DEFAULT_THEME_WEIGHTS,
    themeSignals: DEFAULT_THEME_SIGNALS,
  },
  {
    themeText: "캠핑 불멍 분위기에 어울리는 버거 훈연향 풍미의 음식",
    themeTextEn: "A dish with smoky-flavored burger suitable for a campfire mood",
    axisAType: "분위기",
    axisA: "캠핑 불멍",
    axisBType: "음식종류",
    axisB: "버거",
    axisFlavor: "훈연향",
    themeWeights: DEFAULT_THEME_WEIGHTS,
    themeSignals: DEFAULT_THEME_SIGNALS,
  },
  {
    themeText: "한여름 해변에 어울리는 타코 상큼한 풍미의 음식",
    themeTextEn: "A dish with refreshing-flavored tacos suitable for a midsummer beach",
    axisAType: "장소",
    axisA: "해변",
    axisBType: "음식종류",
    axisB: "타코",
    axisFlavor: "라임",
    themeWeights: DEFAULT_THEME_WEIGHTS,
    themeSignals: DEFAULT_THEME_SIGNALS,
  },
  {
    themeText: "시험 기간 집에 어울리는 볶음 담백한 풍미의 음식",
    themeTextEn: "A dish with mild-flavored stir-fry suitable for an exam season at home",
    axisAType: "상황",
    axisA: "시험 기간",
    axisBType: "조리법",
    axisB: "볶음",
    axisFlavor: "김치 치즈",
    themeWeights: DEFAULT_THEME_WEIGHTS,
    themeSignals: DEFAULT_THEME_SIGNALS,
  },
];

function stableIndexFromString(input: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % Math.max(1, modulo);
}

const DEFAULT_OPENAI_DAY_THEME_MAX_ATTEMPTS = 3;
const DEFAULT_OPENAI_DAY_THEME_RETRY_BASE_MS = 300;
const MAX_OPENAI_DAY_THEME_RETRY_BASE_MS = 5_000;

function getOpenAiDayThemeMaxAttempts() {
  const parsed = Number.parseInt(process.env.OPENAI_DAY_THEME_MAX_ATTEMPTS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_OPENAI_DAY_THEME_MAX_ATTEMPTS;
  }
  return Math.min(parsed, 5);
}

function getOpenAiDayThemeRetryBaseMs() {
  const parsed = Number.parseInt(process.env.OPENAI_DAY_THEME_RETRY_BASE_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_OPENAI_DAY_THEME_RETRY_BASE_MS;
  }
  return Math.min(parsed, MAX_OPENAI_DAY_THEME_RETRY_BASE_MS);
}

function getRetryDelayMs(attempt: number) {
  const baseMs = getOpenAiDayThemeRetryBaseMs();
  const exponential = baseMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * Math.max(1, baseMs / 2));
  return exponential + jitter;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

const TRANSIENT_OPENAI_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
]);

const TRANSIENT_OPENAI_ERROR_NAMES = new Set([
  "FetchError",
  "AbortError",
  "APIConnectionError",
  "TimeoutError",
]);

function isTransientOpenAiError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
  };

  const code = typeof record.code === "string" ? record.code.toUpperCase() : "";
  if (TRANSIENT_OPENAI_ERROR_CODES.has(code)) {
    return true;
  }

  const name = typeof record.name === "string" ? record.name : "";
  if (TRANSIENT_OPENAI_ERROR_NAMES.has(name)) {
    return true;
  }

  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  return message.includes("timeout") || message.includes("network");
}

function shouldRetryDayThemeGeneration(error: unknown) {
  if (error instanceof ProviderError) {
    if (error.code === "INVALID_RESPONSE" || error.code === "TIMEOUT" || error.code === "UNKNOWN") {
      return true;
    }

    if (error.code === "HTTP_ERROR") {
      const status = error.status ?? 0;
      return status === 429 || status >= 500;
    }

    return false;
  }

  return isTransientOpenAiError(error);
}

const isUniqueConstraintError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "code" in error && (error as { code?: string }).code === "P2002";
};

function getFallbackTheme(dayKey: string, recentThemesKo: string[]) {
  const startIndex = stableIndexFromString(dayKey, FALLBACK_THEMES.length);
  const normalizedRecent = new Set(recentThemesKo.map((theme) => theme.trim()).filter(Boolean));

  for (let offset = 0; offset < FALLBACK_THEMES.length; offset += 1) {
    const index = (startIndex + offset) % FALLBACK_THEMES.length;
    const candidate = FALLBACK_THEMES[index];
    if (!normalizedRecent.has(candidate.themeText.trim())) {
      return candidate;
    }
  }

  return FALLBACK_THEMES[startIndex];
}

async function listRecentThemeTexts(limit: number) {
  const rows = await prisma.dayTheme.findMany({
    orderBy: { dayKey: "desc" },
    take: Math.max(0, Math.floor(limit)),
    select: { themeText: true },
  });
  return rows.map((row) => row.themeText).filter(Boolean);
}

export async function getOrCreateDayTheme(dayKey: string, opts?: { userId?: string | null }) {
  const existing = await prisma.dayTheme.findUnique({ where: { dayKey } });
  if (existing) {
    return existing;
  }

  const recentThemesKo = await listRecentThemeTexts(14);
  const fallback = getFallbackTheme(dayKey, recentThemesKo);

  const shouldAttemptOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());

  let themeText = fallback.themeText;
  let themeTextEn = fallback.themeTextEn;
  let axisAType = fallback.axisAType;
  let axisA = fallback.axisA;
  let axisBType = fallback.axisBType;
  let axisB = fallback.axisB;
  let axisFlavor = fallback.axisFlavor;
  let themeWeights = cloneThemeWeights(fallback.themeWeights);
  let themeSignals = cloneThemeSignals(fallback.themeSignals);

  if (shouldAttemptOpenAi) {
    const maxAttempts = getOpenAiDayThemeMaxAttempts();
    let openAiSuccessRaw: {
      model: string;
      openAiResponseId: string | null;
      outputText: string;
      outputJson: unknown;
    } | null = null;
    let lastOpenAiError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { result, raw } = await generateDayThemeWithOpenAiWithRaw({
          dayKey,
          recentThemesKo,
        });

        if (recentThemesKo.includes(result.themeText)) {
          throw new ProviderError({
            provider: "openai",
            code: "INVALID_RESPONSE",
            message: "[openai] Generated theme duplicated recent themes.",
          });
        }

        themeText = result.themeText;
        themeTextEn = result.themeTextEn;
        axisAType = result.axisAType;
        axisA = result.axisA;
        axisBType = result.axisBType;
        axisB = result.axisB;
        axisFlavor = result.axisFlavor;
        themeWeights = result.themeWeights;
        themeSignals = result.themeSignals;
        openAiSuccessRaw = raw;
        break;
      } catch (error) {
        lastOpenAiError = error;
        if (attempt >= maxAttempts || !shouldRetryDayThemeGeneration(error)) {
          break;
        }
        await sleep(getRetryDelayMs(attempt));
      }
    }

    if (openAiSuccessRaw) {
      await prisma.openAiCallLog.create({
        data: {
          kind: "DAY_THEME",
          model: openAiSuccessRaw.model,
          openAiResponseId: openAiSuccessRaw.openAiResponseId,
          userId: opts?.userId ?? null,
          inputPrompt: `dayKey=${dayKey}`,
          outputText: openAiSuccessRaw.outputText,
          outputJson: openAiSuccessRaw.outputJson as object,
          decision: "OK",
          category: "DAY_THEME",
        },
      });
    } else {
      const providerError = lastOpenAiError instanceof ProviderError ? lastOpenAiError : null;
      await prisma.openAiCallLog.create({
        data: {
          kind: "DAY_THEME",
          model: process.env.OPENAI_DAY_THEME_MODEL?.trim() || "gpt-5-mini",
          openAiResponseId: null,
          userId: opts?.userId ?? null,
          inputPrompt: `dayKey=${dayKey}`,
          decision: "FALLBACK",
          category: "DAY_THEME",
          reason: "fallback",
          errorCode: providerError?.code ?? "UNKNOWN",
          errorStatus: providerError?.status ?? null,
          errorMessage:
            providerError?.message ??
            (lastOpenAiError instanceof Error ? lastOpenAiError.message : String(lastOpenAiError)),
        },
      });
    }
  } else {
    await prisma.openAiCallLog.create({
      data: {
        kind: "DAY_THEME",
        model: process.env.OPENAI_DAY_THEME_MODEL?.trim() || "gpt-5-mini",
        openAiResponseId: null,
        userId: opts?.userId ?? null,
        inputPrompt: `dayKey=${dayKey}`,
        decision: "FALLBACK",
        category: "DAY_THEME",
        reason: "missing OPENAI_API_KEY",
        errorCode: "MISSING_ENV",
        errorMessage: "[openai] Missing OPENAI_API_KEY.",
      },
    });
  }

  try {
    return await prisma.dayTheme.create({
      data: {
        dayKey,
        themeText,
        themeTextEn,
        axisAType,
        axisA,
        axisBType,
        axisB,
        axisFlavor,
        themeWeights,
        themeSignals,
        themeImageUrl: null,
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }

  const duplicated = await prisma.dayTheme.findUnique({ where: { dayKey } });
  if (!duplicated) {
    throw new Error("Failed to create day theme due to race condition.");
  }
  return duplicated;
}
