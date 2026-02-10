import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const createReportMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/entities/report/api/create-report", () => ({
  createReport: createReportMock,
}));

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetDishId: "dish-1", reason: "spam" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    });
    expect(createReportMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetDishId: "dish-1" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      code: "MISSING_FIELDS",
      message: "targetDishId and reason are required.",
    });
    expect(createReportMock).not.toHaveBeenCalled();
  });

  it("returns error from domain result", async () => {
    createReportMock.mockResolvedValueOnce({
      type: "error",
      status: 409,
      code: "ALREADY_REPORTED",
      message: "이미 신고한 요리입니다.",
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetDishId: "dish-1", reason: "spam", detail: "test" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      code: "ALREADY_REPORTED",
      message: "이미 신고한 요리입니다.",
    });
    expect(createReportMock).toHaveBeenCalledWith({
      reporterId: "user-1",
      targetDishId: "dish-1",
      reason: "spam",
      detail: "test",
    });
  });

  it("returns 200 when report is created", async () => {
    createReportMock.mockResolvedValueOnce({
      type: "ok",
      reportId: "report-1",
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetDishId: "dish-1",
          reason: "copyright",
          detail: "copied image",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      reportId: "report-1",
    });
  });

  it("returns 500 when domain throws", async () => {
    createReportMock.mockRejectedValueOnce(new Error("db failed"));
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetDishId: "dish-1", reason: "spam" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  });
});
