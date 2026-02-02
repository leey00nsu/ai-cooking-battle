import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getGuestUserId = vi.fn(async () => "guest");
const prisma = {
  adReward: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/guest-user", () => ({ getGuestUserId }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/ads/reward/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      randomUUID: () => "uuid",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates reward with nonce", async () => {
    const { POST } = await import("./route");
    prisma.adReward.findFirst.mockResolvedValue(null);
    prisma.adReward.create.mockResolvedValue({
      id: "reward",
      nonce: "uuid",
      expiresAt: new Date("2026-02-01T00:00:00Z"),
    });

    const response = await POST();
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.nonce).toBe("uuid");
    expect(payload.rewardId).toBe("reward");
  });
});
