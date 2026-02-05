import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  dailySlotCounter: {
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: vi.fn(() => "2026-02-04"),
}));

describe("GET /api/slots/public-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.dailySlotCounter.upsert.mockResolvedValue({
      dayKey: "2026-02-04",
      freeLimit: 60,
      freeUsedCount: 12,
      adLimit: 0,
      adUsedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("returns public slot summary without auth", async () => {
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      freeLimit: 60,
      freeUsedCount: 12,
      adLimit: 0,
      adUsedCount: 0,
    });
  });
});
