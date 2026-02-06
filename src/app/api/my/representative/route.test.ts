import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

const prisma = {
  $transaction: vi.fn(),
  dish: {
    findFirst: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
  activeEntry: {
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
};

type TransactionCallback = (tx: typeof prisma) => Promise<unknown>;

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("POST /api/my/representative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ user: { id: "user" } });
    prisma.$transaction.mockImplementation(async (fn: TransactionCallback) => fn(prisma));
    prisma.dish.findFirst.mockResolvedValue({ id: "dish" });
    prisma.user.update.mockResolvedValue({ representativeDishId: "dish" });
    prisma.activeEntry.findUnique.mockResolvedValue(null);
    prisma.activeEntry.update.mockResolvedValue({ userId: "user" });
    prisma.activeEntry.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("returns 400 when dishId missing", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/my/representative", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const { POST } = await import("./route");
    getSessionMock.mockResolvedValueOnce({ user: { id: "" } });
    const response = await POST(
      new Request("http://localhost/api/my/representative", {
        method: "POST",
        body: JSON.stringify({ dishId: "dish" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when dish not found", async () => {
    const { POST } = await import("./route");
    prisma.dish.findFirst.mockResolvedValueOnce(null);
    const response = await POST(
      new Request("http://localhost/api/my/representative", {
        method: "POST",
        body: JSON.stringify({ dishId: "dish" }),
      }),
    );
    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.code).toBe("DISH_NOT_FOUND");
  });

  it("sets representative dish and syncs active entry dishId when entry exists", async () => {
    const { POST } = await import("./route");
    prisma.activeEntry.findUnique.mockResolvedValueOnce({ userId: "user" });

    const response = await POST(
      new Request("http://localhost/api/my/representative", {
        method: "POST",
        body: JSON.stringify({ dishId: "dish" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, representativeDishId: "dish" });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.activeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user" },
        data: { dishId: "dish" },
      }),
    );
  });

  it("clears representative dish and removes active entry", async () => {
    const { POST } = await import("./route");
    prisma.user.update.mockResolvedValueOnce({ representativeDishId: null });

    const response = await POST(
      new Request("http://localhost/api/my/representative", {
        method: "POST",
        body: JSON.stringify({ clear: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, representativeDishId: null });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { representativeDishId: null },
      }),
    );
    expect(prisma.activeEntry.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user" },
      }),
    );
  });
});
