import { getDayThemeImagePrefixEn, getPlatedDishSuffixEn } from "@/lib/prompts/prompt-templates";
import { generateImageUrl } from "@/lib/providers/leesfield-image-generator";

const PLACEHOLDER_THEME_IMAGE_HOST = "picsum.photos";
const PLACEHOLDER_THEME_IMAGE_PATH_PREFIX = "/seed/day-theme-";

export function shouldReplaceDayThemeImageUrl(themeImageUrl?: string | null) {
  const url = themeImageUrl?.trim() ?? "";
  if (!url) {
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== PLACEHOLDER_THEME_IMAGE_HOST) {
      return false;
    }
    return parsed.pathname.startsWith(PLACEHOLDER_THEME_IMAGE_PATH_PREFIX);
  } catch {
    return true;
  }
}

export function buildDayThemeImagePromptEn(themeTextEn: string) {
  const base = themeTextEn.replace(/\s+/g, " ").trim();
  const prefix = getDayThemeImagePrefixEn();
  const suffix = getPlatedDishSuffixEn();
  return `${prefix} ${base}, ${suffix}`;
}

export async function generateDayThemeImageUrl(args: { themeTextEn: string }) {
  const prompt = buildDayThemeImagePromptEn(args.themeTextEn);
  const result = await generateImageUrl(
    {
      prompt,
      width: 1024,
      height: 1024,
      steps: 9,
      imageCount: 1,
    },
    { timeoutMs: 120_000, pollIntervalMs: 1200 },
  );
  return result.url;
}
