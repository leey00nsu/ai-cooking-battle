import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateImageUrl: vi.fn(async () => ({ url: "https://cdn.example/theme.png" })),
}));

vi.mock("@/lib/providers/leesfield-image-generator", () => ({
  generateImageUrl: mocks.generateImageUrl,
}));

import {
  buildDayThemeImagePromptEn,
  generateDayThemeImageUrl,
  shouldReplaceDayThemeImageUrl,
} from "@/lib/day-theme/day-theme-image";

describe("day-theme-image", () => {
  it("builds prompt with prefix and suffix", () => {
    const prompt = buildDayThemeImagePromptEn("Shrimp tacos with lime for a beach day");
    expect(prompt).toContain("representing today's cooking theme");
    expect(prompt).toContain("Shrimp tacos with lime");
    expect(prompt).toContain("food photography");
    expect(prompt).toContain(", ");
  });

  it("detects placeholder theme image url", () => {
    expect(shouldReplaceDayThemeImageUrl(null)).toBe(true);
    expect(shouldReplaceDayThemeImageUrl("")).toBe(true);
    expect(
      shouldReplaceDayThemeImageUrl("https://picsum.photos/seed/day-theme-2026-02-05/800/800"),
    ).toBe(true);
    expect(shouldReplaceDayThemeImageUrl("https://assets.example.com/theme.png")).toBe(false);
  });

  it("generates day theme image url via provider", async () => {
    const url = await generateDayThemeImageUrl({ themeTextEn: "Kimchi fried rice" });
    expect(url).toBe("https://cdn.example/theme.png");
    expect(mocks.generateImageUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Kimchi fried rice"),
      }),
      expect.any(Object),
    );
  });
});
