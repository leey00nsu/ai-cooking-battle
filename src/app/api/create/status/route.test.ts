import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn(async () => ({ user: { id: "user" } }));

const prisma = {
  createRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  slotReservation: {
    findUnique: vi.fn(),
  },
};

const hasReservationExpired = vi.fn(() => false);
const reclaimSlotReservation = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

vi.mock("@/lib/slot-recovery", () => ({
  hasReservationExpired,
  reclaimSlotReservation,
}));

describe("GET /api/create/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when missing query", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/create/status");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const request = new Request("http://localhost/api/create/status?requestId=req");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns status for requestId", async () => {
    const { GET } = await import("./route");
    prisma.createRequest.findFirst.mockResolvedValueOnce({
      id: "req",
      userId: "user",
      reservationId: "res",
      status: "GENERATING",
      dishId: null,
      imageUrl: null,
    });
    prisma.slotReservation.findUnique.mockResolvedValueOnce({
      id: "res",
      status: "CONFIRMED",
      expiresAt: new Date(Date.now() - 1_000),
    });

    const request = new Request("http://localhost/api/create/status?requestId=req");
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "GENERATING",
      dishId: null,
      imageUrl: null,
    });
  });

  it("returns ok false payload when failed", async () => {
    const { GET } = await import("./route");
    prisma.createRequest.findFirst.mockResolvedValueOnce({
      id: "req",
      userId: "user",
      reservationId: "res",
      status: "FAILED",
      dishId: null,
      imageUrl: null,
    });
    prisma.slotReservation.findUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/create/status?requestId=req");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("GENERATE_FAILED");
  });
});
