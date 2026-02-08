import { describe, expect, it } from "vitest";
import { selectDailyPersonas } from "@/entities/bot-persona/model/select-daily-personas";

const CANDIDATES = [
  { personaKey: "p1", styleGroup: "a", isActive: true },
  { personaKey: "p2", styleGroup: "a", isActive: true },
  { personaKey: "p3", styleGroup: "a", isActive: true },
  { personaKey: "p4", styleGroup: "b", isActive: true },
  { personaKey: "p5", styleGroup: "b", isActive: true },
  { personaKey: "p6", styleGroup: "c", isActive: true },
  { personaKey: "p7", styleGroup: "d", isActive: true },
  { personaKey: "p8", styleGroup: "e", isActive: true },
] as const;

function toKey(items: { personaKey: string }[]) {
  return items.map((item) => item.personaKey).join("|");
}

function createRandom(values: number[], fallback = 0.5) {
  let index = 0;
  return () => {
    const value = values[index];
    index += 1;
    return value ?? fallback;
  };
}

describe("selectDailyPersonas", () => {
  it("can produce different results on repeated runs for same dayKey", () => {
    const first = selectDailyPersonas({
      dayKey: "2026-02-08",
      personas: [...CANDIDATES],
      maxPerStyleGroup: 8,
      random: createRandom([0, 0, 0, 0, 0, 0, 0]),
    });
    const second = selectDailyPersonas({
      dayKey: "2026-02-08",
      personas: [...CANDIDATES],
      maxPerStyleGroup: 8,
      random: createRandom([0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]),
    });

    expect(toKey(first.selected)).not.toBe(toKey(second.selected));
  });

  it("limits styleGroup concentration when enough candidates exist", () => {
    const result = selectDailyPersonas({
      dayKey: "2026-02-08",
      personas: [...CANDIDATES],
      pickCount: 5,
      maxPerStyleGroup: 2,
      random: createRandom([0.1, 0.7, 0.3, 0.9, 0.2, 0.8, 0.4]),
    });

    const groupCounts = result.selected.reduce<Record<string, number>>((acc, item) => {
      acc[item.styleGroup] = (acc[item.styleGroup] ?? 0) + 1;
      return acc;
    }, {});

    expect(result.selected).toHaveLength(5);
    expect(Math.max(...Object.values(groupCounts))).toBeLessThanOrEqual(2);
  });

  it("returns fallback as remaining active candidates excluding selected", () => {
    const result = selectDailyPersonas({
      dayKey: "2026-02-08",
      personas: [...CANDIDATES],
      pickCount: 5,
      random: createRandom([0.5, 0.2, 0.8, 0.1, 0.7, 0.3, 0.9]),
    });

    const selectedKeys = new Set(result.selected.map((item) => item.personaKey));
    expect(result.fallback.every((item) => !selectedKeys.has(item.personaKey))).toBe(true);
    expect(result.selected.length + result.fallback.length).toBe(CANDIDATES.length);
  });
});
