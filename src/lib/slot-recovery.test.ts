import { describe, expect, it } from "vitest";
import { clampCounter, hasReservationExpired } from "@/lib/slot-recovery";

describe("slot-recovery", () => {
  it("detects expired reservations", () => {
    const expired = { expiresAt: new Date(Date.now() - 1000) };
    const active = { expiresAt: new Date(Date.now() + 1000) };

    expect(hasReservationExpired(expired)).toBe(true);
    expect(hasReservationExpired(active)).toBe(false);
  });

  it("clamps negative used counts", () => {
    const counter = {
      dayKey: "2026-02-01",
      freeLimit: 30,
      adLimit: 30,
      freeUsedCount: -2,
      adUsedCount: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const clamped = clampCounter(counter);
    expect(clamped.freeUsedCount).toBe(0);
    expect(clamped.adUsedCount).toBe(0);
  });
});
