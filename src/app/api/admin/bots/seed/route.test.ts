import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const enqueueBotSeedJobMock = vi.fn();
const formatDayKeyForKSTMock = vi.fn(() => "2026-02-08");

const prisma = {
  botSeedRun: {
    findUnique: vi.fn(),
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

vi.mock("@/lib/queue/bot-seed-job", () => ({
  enqueueBotSeedJob: enqueueBotSeedJobMock,
}));

vi.mock("@/shared/lib/day-key", () => ({
  formatDayKeyForKST: formatDayKeyForKSTMock,
}));

describe("/api/admin/bots/seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getSessionMock.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
    prisma.botSeedRun.findUnique.mockResolvedValue(null);
    enqueueBotSeedJobMock.mockResolvedValue("job-1");
  });

  it("GET returns 401 when unauthenticated", async () => {
    const { GET } = await import("./route");
    getSessionMock.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost/api/admin/bots/seed?dayKey=2026-02-08"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
  });

  it("GET returns 403 when non-admin user", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/admin/bots/seed?dayKey=2026-02-08"),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "관리자 권한이 필요합니다.",
    });
  });

  it("GET returns 400 for invalid dayKey format", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/admin/bots/seed?dayKey=20260208"));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_DAY_KEY");
  });

  it("GET returns 404 when seed run does not exist", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/admin/bots/seed?dayKey=2026-02-08"),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      code: "SEED_RUN_NOT_FOUND",
      message: "Seed run not found.",
    });
  });

  it("GET returns seed run detail for admin user", async () => {
    vi.stubEnv("ADMIN_USER_EMAILS", "admin@example.com");
    getSessionMock.mockResolvedValueOnce({ user: { id: "member-1", email: "Admin@Example.com" } });
    prisma.botSeedRun.findUnique.mockResolvedValueOnce({
      id: "run-1",
      dayKey: "2026-02-08",
      triggerType: "ADMIN",
      status: "SUCCEEDED",
      selectedCount: 5,
      successCount: 5,
      startedAt: new Date("2026-02-08T01:00:00.000Z"),
      finishedAt: new Date("2026-02-08T01:02:00.000Z"),
      updatedAt: new Date("2026-02-08T01:02:30.000Z"),
      seedItems: [
        {
          id: "item-1",
          personaKey: "triple-silhouette",
          selectedOrder: 1,
          attempt: 1,
          status: "SUCCEEDED",
          errorCode: null,
          errorMessage: null,
          createdAt: new Date("2026-02-08T01:01:00.000Z"),
          persona: {
            displayName: "트리플 실루엣",
            styleGroup: "precision",
          },
          dish: {
            id: "dish-1",
            imageUrl: "https://cdn.example/dish-1.webp",
          },
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/admin/bots/seed?dayKey=2026-02-08"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      seedRun: {
        id: "run-1",
        dayKey: "2026-02-08",
        triggerType: "ADMIN",
        status: "SUCCEEDED",
        selectedCount: 5,
        successCount: 5,
        startedAt: "2026-02-08T01:00:00.000Z",
        finishedAt: "2026-02-08T01:02:00.000Z",
        updatedAt: "2026-02-08T01:02:30.000Z",
        items: [
          {
            id: "item-1",
            personaKey: "triple-silhouette",
            personaDisplayName: "트리플 실루엣",
            styleGroup: "precision",
            selectedOrder: 1,
            attempt: 1,
            status: "SUCCEEDED",
            dishId: "dish-1",
            dishImageUrl: "https://cdn.example/dish-1.webp",
            errorCode: null,
            errorMessage: null,
            createdAt: "2026-02-08T01:01:00.000Z",
          },
        ],
      },
    });
  });

  it("POST enqueues admin seed job with singleton disabled", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/bots/seed", {
        method: "POST",
        body: JSON.stringify({ dayKey: "2026-02-08" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(enqueueBotSeedJobMock).toHaveBeenCalledWith(
      { dayKey: "2026-02-08", triggerType: "ADMIN" },
      { singleton: false },
    );
    expect(await response.json()).toEqual({
      ok: true,
      dayKey: "2026-02-08",
      triggerType: "ADMIN",
      jobId: "job-1",
    });
  });

  it("POST uses KST dayKey when payload dayKey is omitted", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/bots/seed", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(202);
    expect(formatDayKeyForKSTMock).toHaveBeenCalled();
    expect(enqueueBotSeedJobMock).toHaveBeenCalledWith(
      { dayKey: "2026-02-08", triggerType: "ADMIN" },
      { singleton: false },
    );
  });

  it("POST returns 400 for invalid dayKey", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "user-1");
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/admin/bots/seed", {
        method: "POST",
        body: JSON.stringify({ dayKey: "20260208" }),
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_DAY_KEY");
  });
});
