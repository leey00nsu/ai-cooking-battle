import { prisma } from "@/lib/prisma";
import { generateDayThemeWithOpenAiWithRaw } from "@/lib/providers/openai-day-theme-generator";
import { ProviderError } from "@/lib/providers/provider-error";

type FallbackDayTheme = {
  themeText: string;
  themeTextEn: string;
  axisAType: "상황" | "장소" | "분위기";
  axisA: string;
  axisBType: "음식종류" | "특정재료" | "조리법";
  axisB: string;
  axisFlavor: string;
};

const FALLBACK_THEMES: FallbackDayTheme[] = [
  {
    themeText: "비 오는 밤에 어울리는 닭꼬치 매콤한 풍미의 음식",
    themeTextEn: "A dish with spicy-flavored chicken skewers suitable for a rainy night",
    axisAType: "상황",
    axisA: "비 오는 밤",
    axisBType: "특정재료",
    axisB: "닭꼬치",
    axisFlavor: "고추장 양념",
  },
  {
    themeText: "봄 소풍 공원에 어울리는 디저트 상큼한 풍미의 음식",
    themeTextEn: "A dish with refreshing-flavored dessert suitable for a spring picnic park",
    axisAType: "장소",
    axisA: "공원",
    axisBType: "특정재료",
    axisB: "딸기와 요거트",
    axisFlavor: "상큼한",
  },
  {
    themeText: "캠핑 불멍 분위기에 어울리는 버거 훈연향 풍미의 음식",
    themeTextEn: "A dish with smoky-flavored burger suitable for a campfire mood",
    axisAType: "분위기",
    axisA: "캠핑 불멍",
    axisBType: "음식종류",
    axisB: "버거",
    axisFlavor: "훈연향",
  },
  {
    themeText: "한여름 해변에 어울리는 타코 상큼한 풍미의 음식",
    themeTextEn: "A dish with refreshing-flavored tacos suitable for a midsummer beach",
    axisAType: "장소",
    axisA: "해변",
    axisBType: "음식종류",
    axisB: "타코",
    axisFlavor: "라임",
  },
  {
    themeText: "시험 기간 집에 어울리는 볶음 담백한 풍미의 음식",
    themeTextEn: "A dish with mild-flavored stir-fry suitable for an exam season at home",
    axisAType: "상황",
    axisA: "시험 기간",
    axisBType: "조리법",
    axisB: "볶음",
    axisFlavor: "김치 치즈",
  },
];

function stableIndexFromString(input: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % Math.max(1, modulo);
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

  if (shouldAttemptOpenAi) {
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

      await prisma.openAiCallLog.create({
        data: {
          kind: "DAY_THEME",
          model: raw.model,
          openAiResponseId: raw.openAiResponseId,
          userId: opts?.userId ?? null,
          inputPrompt: `dayKey=${dayKey}`,
          outputText: raw.outputText,
          outputJson: raw.outputJson as object,
          decision: "OK",
          category: "DAY_THEME",
        },
      });
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : null;
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
            providerError?.message ?? (error instanceof Error ? error.message : String(error)),
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
