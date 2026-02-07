import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  activeEntry: {
    findUnique: vi.fn(),
  },
  dish: {
    findFirst: vi.fn(),
  },
  dishDayScore: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: vi.fn(() => "2026-02-06"),
}));

import { computeUserStatus } from "@/lib/user-status/compute-user-status";

describe("computeUserStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ representativeDishId: "dish" });
    prisma.activeEntry.findUnique.mockResolvedValue({ isActive: true });
    prisma.dish.findFirst.mockResolvedValue({ id: "dish", isHidden: false });
    prisma.dishDayScore.findUnique.mockResolvedValue({ id: "score" });
  });

  it("returns AUTH when userId is empty", async () => {
    await expect(computeUserStatus("")).resolves.toBe("AUTH");
    await expect(computeUserStatus("   ")).resolves.toBe("AUTH");
  });

  it("returns AUTH when user not found", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when representative dish missing", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ representativeDishId: null });
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when active entry not found", async () => {
    prisma.activeEntry.findUnique.mockResolvedValueOnce(null);
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when active entry is inactive", async () => {
    prisma.activeEntry.findUnique.mockResolvedValueOnce({ isActive: false });
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when representative dish not found", async () => {
    prisma.dish.findFirst.mockResolvedValueOnce(null);
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when dish hidden", async () => {
    prisma.dish.findFirst.mockResolvedValueOnce({ id: "dish", isHidden: true });
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns AUTH when day score missing", async () => {
    prisma.dishDayScore.findUnique.mockResolvedValueOnce(null);
    await expect(computeUserStatus("user")).resolves.toBe("AUTH");
  });

  it("returns ELIGIBLE when all conditions satisfied", async () => {
    await expect(computeUserStatus("user")).resolves.toBe("ELIGIBLE");
  });
});
