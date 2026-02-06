import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

type TransactionCallback = (tx: typeof prisma) => Promise<unknown>;

const prisma = {
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
  },
  activeEntry: {
    upsert: vi.fn(),
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

describe("POST /api/my/active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ user: { id: "user" } });
    prisma.$transaction.mockImplementation(async (fn: TransactionCallback) => fn(prisma));
    prisma.user.findUnique.mockResolvedValue({ representativeDishId: "dish" });
    prisma.activeEntry.upsert.mockResolvedValue({ isActive: true, dishId: "dish" });
  });

  it("returns 400 when isActive invalid", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/my/active", {
        method: "POST",
        body: JSON.stringify({ isActive: "yes" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const response = await POST(
      new Request("http://localhost/api/my/active", {
        method: "POST",
        body: JSON.stringify({ isActive: true }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when representative dish missing", async () => {
    const { POST } = await import("./route");
    prisma.user.findUnique.mockResolvedValueOnce({ representativeDishId: null });
    const response = await POST(
      new Request("http://localhost/api/my/active", {
        method: "POST",
        body: JSON.stringify({ isActive: true }),
      }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("REPRESENTATIVE_REQUIRED");
  });

  it("upserts active entry", async () => {
    const { POST } = await import("./route");
    prisma.activeEntry.upsert.mockResolvedValueOnce({ isActive: false, dishId: "dish" });
    const response = await POST(
      new Request("http://localhost/api/my/active", {
        method: "POST",
        body: JSON.stringify({ isActive: false }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, isActive: false, dishId: "dish" });
    expect(prisma.activeEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user" },
        update: { dishId: "dish", isActive: false },
        create: { userId: "user", dishId: "dish", isActive: false },
      }),
    );
  });
});
