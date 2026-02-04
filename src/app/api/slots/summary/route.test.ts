import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const prisma = {
  dailySlotCounter: {
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  slotReservation: {
    count: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: vi.fn(() => "2026-02-04"),
}));

describe("GET /api/slots/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.dailySlotCounter.upsert.mockResolvedValue({
      dayKey: "2026-02-04",
      freeLimit: 60,
      freeUsedCount: 0,
      adLimit: 0,
      adUsedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.findUnique.mockResolvedValue({ freeDailyLimit: 1 });
    prisma.slotReservation.count.mockResolvedValue(0);
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const response = await GET(new Request("http://localhost/api/slots/summary"));
    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.code).toBe("UNAUTHORIZED");
  });

  it("returns canUseFreeSlotToday=true when user still has remaining freeDailyLimit", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    prisma.user.findUnique.mockResolvedValueOnce({ freeDailyLimit: 999 });
    prisma.slotReservation.count.mockResolvedValueOnce(1);

    const response = await GET(new Request("http://localhost/api/slots/summary"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      freeLimit: 60,
      freeUsedCount: 0,
      adLimit: 0,
      adUsedCount: 0,
      freeDailyLimit: 999,
      activeFreeReservationCount: 1,
      canUseFreeSlotToday: true,
    });
  });

  it("returns canUseFreeSlotToday=false when daily limit reached", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "user" } });
    prisma.user.findUnique.mockResolvedValueOnce({ freeDailyLimit: 2 });
    prisma.slotReservation.count.mockResolvedValueOnce(2);

    const response = await GET(new Request("http://localhost/api/slots/summary"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.canUseFreeSlotToday).toBe(false);
  });
});
