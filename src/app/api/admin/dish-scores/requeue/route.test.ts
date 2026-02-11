import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const requeueDishScoresMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/entities/dish/api/requeue-dish-scores", () => ({
  requeueDishScores: requeueDishScoresMock,
}));

describe("POST /api/admin/dish-scores/requeue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getSessionMock.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    requeueDishScoresMock.mockResolvedValue({
      type: "ok",
      dayKey: "2026-02-12",
      requested: 3,
      enqueued: 2,
      skipped: 1,
      failed: 0,
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/dish-scores/requeue", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
  });

  it("returns 403 when non-admin user", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/dish-scores/requeue", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "관리자 권한이 필요합니다.",
    });
  });

  it("passes payload to domain and returns counts", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/dish-scores/requeue", {
        method: "POST",
        body: JSON.stringify({ dayKey: "2026-02-12", limit: 50 }),
      }),
    );

    expect(response.status).toBe(202);
    expect(requeueDishScoresMock).toHaveBeenCalledWith({
      dayKey: "2026-02-12",
      dishId: undefined,
      limit: 50,
    });
    expect(await response.json()).toEqual({
      ok: true,
      dayKey: "2026-02-12",
      requested: 3,
      enqueued: 2,
      skipped: 1,
      failed: 0,
    });
  });

  it("passes dishId payload to domain", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/dish-scores/requeue", {
        method: "POST",
        body: JSON.stringify({ dayKey: "2026-02-12", dishId: "dish-123" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(requeueDishScoresMock).toHaveBeenCalledWith({
      dayKey: "2026-02-12",
      dishId: "dish-123",
      limit: undefined,
    });
  });

  it("returns domain error response", async () => {
    vi.stubEnv("ADMIN_USER_EMAILS", "admin@example.com");
    getSessionMock.mockResolvedValueOnce({
      user: { id: "member-1", email: "Admin@Example.com" },
    });
    requeueDishScoresMock.mockResolvedValueOnce({
      type: "error",
      status: 400,
      code: "INVALID_DAY_KEY",
      message: "dayKey format must be YYYY-MM-DD.",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/dish-scores/requeue", {
        method: "POST",
        body: JSON.stringify({ dayKey: "20260212" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INVALID_DAY_KEY",
      message: "dayKey format must be YYYY-MM-DD.",
    });
  });
});
