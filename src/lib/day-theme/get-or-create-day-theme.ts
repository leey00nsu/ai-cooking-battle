import { prisma } from "@/lib/prisma";

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

export async function getOrCreateDayTheme(dayKey: string) {
  const existing = await prisma.dayTheme.findUnique({ where: { dayKey } });
  if (existing) {
    return existing;
  }

  const fallback = FALLBACK_THEMES[stableIndexFromString(dayKey, FALLBACK_THEMES.length)];
  const themeImageUrl = `https://picsum.photos/seed/day-theme-${dayKey}/800/800`;

  try {
    return await prisma.dayTheme.create({
      data: {
        dayKey,
        themeText: fallback.themeText,
        themeTextEn: fallback.themeTextEn,
        themeImageUrl,
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
