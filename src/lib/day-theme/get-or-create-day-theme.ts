import { prisma } from "@/lib/prisma";
import { generateDayThemeWithOpenAiWithRaw } from "@/lib/providers/openai-day-theme-generator";
import { ProviderError } from "@/lib/providers/provider-error";

type FallbackDayTheme = {
  themeText: string;
  themeTextEn: string;
};

const FALLBACK_THEMES: FallbackDayTheme[] = [
  {
    themeText: "비 오는 밤, 포장마차에 어울리는 고추장 양념 닭꼬치",
    themeTextEn: "Gochujang-glazed chicken skewers for a rainy-night street stall",
  },
  {
    themeText: "봄 소풍, 공원에 어울리는 딸기와 요거트가 들어간 디저트",
    themeTextEn: "A strawberry-and-yogurt dessert for a spring picnic in the park",
  },
  {
    themeText: "캠핑 불멍, 산속에 어울리는 훈연 향이 나는 치즈 버거",
    themeTextEn: "A smoky cheeseburger for a campfire night in the mountains",
  },
  {
    themeText: "한여름 해변, 바다에 어울리는 라임이 들어간 새우 타코",
    themeTextEn: "Shrimp tacos with lime for a midsummer beach day",
  },
  {
    themeText: "시험 기간, 집에 어울리는 김치와 치즈를 올린 볶음밥",
    themeTextEn: "Kimchi fried rice topped with cheese for an exam-season stay-at-home night",
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
