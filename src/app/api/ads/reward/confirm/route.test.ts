import { beforeEach, describe, expect, it, vi } from "vitest";

const getGuestUserId = vi.fn(async () => "guest");
const prisma = {
  adReward: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/guest-user", () => ({ getGuestUserId }));
vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/ads/reward/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when missing fields", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ads/reward/confirm", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when reward not found", async () => {
    const { POST } = await import("./route");
    prisma.adReward.findFirst.mockResolvedValue(null);
    const request = new Request("http://localhost/api/ads/reward/confirm", {
      method: "POST",
      body: JSON.stringify({ nonce: "nonce", idempotencyKey: "key" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns ok when already granted with same idempotencyKey", async () => {
    const { POST } = await import("./route");
    prisma.adReward.findFirst.mockResolvedValue({
      id: "reward",
      nonce: "nonce",
      status: "GRANTED",
      confirmIdempotencyKey: "key",
      expiresAt: null,
    });

    const request = new Request("http://localhost/api/ads/reward/confirm", {
      method: "POST",
      body: JSON.stringify({ nonce: "nonce", idempotencyKey: "key" }),
    });

    const response = await POST(request);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.rewardId).toBe("reward");
  });

  it("updates reward when valid", async () => {
    const { POST } = await import("./route");
    prisma.adReward.findFirst.mockResolvedValue({
      id: "reward",
      nonce: "nonce",
      status: "PENDING",
      confirmIdempotencyKey: null,
      expiresAt: null,
      grantedAt: null,
    });
    prisma.adReward.update.mockResolvedValue({
      id: "reward",
      status: "GRANTED",
    });

    const request = new Request("http://localhost/api/ads/reward/confirm", {
      method: "POST",
      body: JSON.stringify({ nonce: "nonce", idempotencyKey: "key" }),
    });

    const response = await POST(request);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("GRANTED");
  });
});
