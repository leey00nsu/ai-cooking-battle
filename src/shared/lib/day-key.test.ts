import { describe, expect, it } from "vitest";
import { formatDayKey, formatDayKeyForKST } from "@/shared/lib/day-key";

describe("day-key", () => {
  it("formats local day key", () => {
    const date = new Date(2026, 0, 31, 0, 0, 0);
    expect(formatDayKey(date)).toBe("2026-01-31");
  });

  it("formats KST day key", () => {
    const date = new Date("2026-01-31T15:04:05.000Z");
    expect(formatDayKeyForKST(date)).toBe("2026-02-01");
  });
});
