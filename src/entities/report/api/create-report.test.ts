import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = {
  $transaction: vi.fn(),
  dish: {
    findFirst: vi.fn(),
  },
  report: {
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("createReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REPORT_DAILY_LIMIT;
  });

  it("returns invalid input error when required fields are missing", async () => {
    const { createReport } = await import("./create-report");
    const result = await createReport({
      reporterId: "",
      targetDishId: "dish-1",
      reason: "spam",
    });

    expect(result).toEqual({
      type: "error",
      status: 400,
      code: "MISSING_REPORTER_ID",
      message: "reporterId is required.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns not found when target dish does not exist", async () => {
    prisma.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        dish: { findFirst: vi.fn().mockResolvedValue(null) },
        report: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
      }),
    );

    const { createReport } = await import("./create-report");
    const result = await createReport({
      reporterId: "user-1",
      targetDishId: "dish-404",
      reason: "spam",
    });

    expect(result).toEqual({
      type: "error",
      status: 404,
      code: "DISH_NOT_FOUND",
      message: "Dish not found.",
    });
  });

  it("returns duplicate error when report already exists", async () => {
    prisma.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        dish: { findFirst: vi.fn().mockResolvedValue({ id: "dish-1" }) },
        report: {
          findUnique: vi.fn().mockResolvedValue({ id: "report-1" }),
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn(),
        },
      }),
    );

    const { createReport } = await import("./create-report");
    const result = await createReport({
      reporterId: "user-1",
      targetDishId: "dish-1",
      reason: "spam",
    });

    expect(result).toEqual({
      type: "error",
      status: 409,
      code: "ALREADY_REPORTED",
      message: "이미 신고한 요리입니다.",
    });
  });

  it("returns rate-limited when daily count reaches limit", async () => {
    process.env.REPORT_DAILY_LIMIT = "2";
    prisma.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        dish: { findFirst: vi.fn().mockResolvedValue({ id: "dish-1" }) },
        report: {
          findUnique: vi.fn().mockResolvedValue(null),
          count: vi.fn().mockResolvedValue(2),
          create: vi.fn(),
        },
      }),
    );

    const { createReport } = await import("./create-report");
    const result = await createReport({
      reporterId: "user-1",
      targetDishId: "dish-1",
      reason: "spam",
    });

    expect(result).toEqual({
      type: "error",
      status: 429,
      code: "RATE_LIMITED",
      message: "오늘 신고 한도를 초과했습니다.",
    });
  });

  it("creates report on valid request", async () => {
    const createMock = vi.fn().mockResolvedValue({ id: "report-1" });
    prisma.$transaction.mockImplementationOnce(async (callback) =>
      callback({
        dish: { findFirst: vi.fn().mockResolvedValue({ id: "dish-1" }) },
        report: {
          findUnique: vi.fn().mockResolvedValue(null),
          count: vi.fn().mockResolvedValue(0),
          create: createMock,
        },
      }),
    );

    const { createReport } = await import("./create-report");
    const result = await createReport({
      reporterId: "user-1",
      targetDishId: "dish-1",
      reason: "copyright",
      detail: "copied image",
    });

    expect(result).toEqual({
      type: "ok",
      reportId: "report-1",
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        reporterId: "user-1",
        targetDishId: "dish-1",
        reason: "copyright",
        detail: "copied image",
      },
      select: { id: true },
    });
  });
});
