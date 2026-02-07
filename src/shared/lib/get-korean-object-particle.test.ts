import { describe, expect, it } from "vitest";
import { getKoreanObjectParticle } from "@/shared/lib/get-korean-object-particle";

describe("getKoreanObjectParticle", () => {
  it("returns 을 when final consonant exists", () => {
    expect(getKoreanObjectParticle("밥")).toBe("을");
  });

  it("returns 을 when final consonant exists (multi-char)", () => {
    expect(getKoreanObjectParticle("라면")).toBe("을");
  });

  it("returns 를 when final consonant missing", () => {
    expect(getKoreanObjectParticle("피자")).toBe("를");
  });

  it("returns fallback for non-hangul or empty text", () => {
    expect(getKoreanObjectParticle("pizza")).toBe("(을/를)");
    expect(getKoreanObjectParticle("")).toBe("(을/를)");
  });
});
