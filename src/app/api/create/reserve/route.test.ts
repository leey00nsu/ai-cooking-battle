import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn(async () => ({ user: { id: "user" } }));

const tx = {
  slotReservation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  dailySlotCounter: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  adReward: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

const prisma = {
  $transaction: vi.fn(async (fn: (txArg: typeof tx) => Promise<unknown>) => await fn(tx)),
};

const reclaimSlotReservation = vi.fn();
const formatDayKeyForKST = vi.fn(() => "2026-02-03");

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/slot-recovery", () => ({
  reclaimSlotReservation,
}));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST,
}));

describe("POST /api/create/reserve", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tx.slotReservation.findUnique.mockResolvedValue(null);
    tx.dailySlotCounter.upsert.mockResolvedValue({
      dayKey: "2026-02-03",
      freeLimit: 60,
      adLimit: 0,
      freeUsedCount: 0,
      adUsedCount: 0,
    });
    tx.user.findUnique.mockResolvedValue({ freeDailyLimit: 1 });
    tx.slotReservation.count.mockResolvedValue(0);
    tx.slotReservation.create.mockResolvedValue({
      id: "res",
      slotType: "FREE",
      expiresAt: new Date(Date.now() + 60_000),
    });
    tx.dailySlotCounter.update.mockResolvedValue({});
  });

  it("creates free reservation when under default daily limit", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/create/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "k1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.slotType).toBe("free");
    expect(tx.slotReservation.count).toHaveBeenCalledWith({
      where: {
        userId: "user",
        dayKey: "2026-02-03",
        slotType: "FREE",
        status: { in: ["RESERVED", "CONFIRMED"] },
      },
    });
  });

  it("returns 429 when free limit reached for default user", async () => {
    const { POST } = await import("./route");
    tx.slotReservation.count.mockResolvedValueOnce(1);

    const request = new Request("http://localhost/api/create/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "k2" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.code).toBe("FREE_SLOT_LIMIT_REACHED");
  });

  it("allows reservation for tester user with freeDailyLimit=999", async () => {
    const { POST } = await import("./route");
    tx.user.findUnique.mockResolvedValueOnce({ freeDailyLimit: 999 });
    tx.slotReservation.count.mockResolvedValueOnce(1);

    const request = new Request("http://localhost/api/create/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "k3" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.slotType).toBe("free");
  });
});
