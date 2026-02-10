import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

const REPORT_DAILY_LIMIT_DEFAULT = 5;
const MAX_REASON_LENGTH = 40;
const MAX_DETAIL_LENGTH = 500;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export type CreateReportInput = {
  reporterId: string;
  targetDishId: string;
  reason: string;
  detail?: string | null;
};

export type CreateReportResult =
  | {
      type: "ok";
      reportId: string;
    }
  | {
      type: "error";
      status: number;
      code: string;
      message: string;
    };

function toDailyReportLimit() {
  const raw = Number(process.env.REPORT_DAILY_LIMIT ?? REPORT_DAILY_LIMIT_DEFAULT);
  if (!Number.isFinite(raw) || raw <= 0) {
    return REPORT_DAILY_LIMIT_DEFAULT;
  }
  return Math.floor(raw);
}

function getKstDayRange(now = new Date()) {
  const dayKey = formatDayKeyForKST(now);
  const startAt = new Date(`${dayKey}T00:00:00+09:00`);
  const endAt = new Date(startAt.getTime() + DAY_IN_MILLISECONDS);
  return { startAt, endAt };
}

function normalizeInput(input: CreateReportInput) {
  return {
    reporterId: input.reporterId.toString().trim(),
    targetDishId: input.targetDishId.toString().trim(),
    reason: input.reason.toString().trim(),
    detail: input.detail?.toString().trim() || null,
  };
}

function validateInput(input: ReturnType<typeof normalizeInput>): CreateReportResult | null {
  if (!input.reporterId) {
    return {
      type: "error",
      status: 400,
      code: "MISSING_REPORTER_ID",
      message: "reporterId is required.",
    };
  }
  if (!input.targetDishId) {
    return {
      type: "error",
      status: 400,
      code: "MISSING_TARGET_DISH_ID",
      message: "targetDishId is required.",
    };
  }
  if (!input.reason) {
    return {
      type: "error",
      status: 400,
      code: "MISSING_REASON",
      message: "reason is required.",
    };
  }
  if (input.reason.length > MAX_REASON_LENGTH) {
    return {
      type: "error",
      status: 400,
      code: "REASON_TOO_LONG",
      message: `reason must be at most ${MAX_REASON_LENGTH} characters.`,
    };
  }
  if (input.detail && input.detail.length > MAX_DETAIL_LENGTH) {
    return {
      type: "error",
      status: 400,
      code: "DETAIL_TOO_LONG",
      message: `detail must be at most ${MAX_DETAIL_LENGTH} characters.`,
    };
  }
  return null;
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const normalized = normalizeInput(input);
  const invalid = validateInput(normalized);
  if (invalid) {
    return invalid;
  }

  try {
    const { startAt, endAt } = getKstDayRange();
    const dailyLimit = toDailyReportLimit();

    return await prisma.$transaction(async (tx): Promise<CreateReportResult> => {
      const dish = await tx.dish.findFirst({
        where: {
          id: normalized.targetDishId,
          isHidden: false,
        },
        select: { id: true },
      });

      if (!dish) {
        return {
          type: "error",
          status: 404,
          code: "DISH_NOT_FOUND",
          message: "Dish not found.",
        };
      }

      const [existing, dailyCount] = await Promise.all([
        tx.report.findUnique({
          where: {
            reporterId_targetDishId: {
              reporterId: normalized.reporterId,
              targetDishId: normalized.targetDishId,
            },
          },
          select: { id: true },
        }),
        tx.report.count({
          where: {
            reporterId: normalized.reporterId,
            createdAt: {
              gte: startAt,
              lt: endAt,
            },
          },
        }),
      ]);

      if (existing) {
        return {
          type: "error",
          status: 409,
          code: "ALREADY_REPORTED",
          message: "이미 신고한 요리입니다.",
        };
      }

      if (dailyCount >= dailyLimit) {
        return {
          type: "error",
          status: 429,
          code: "RATE_LIMITED",
          message: "오늘 신고 한도를 초과했습니다.",
        };
      }

      const report = await tx.report.create({
        data: {
          reporterId: normalized.reporterId,
          targetDishId: normalized.targetDishId,
          reason: normalized.reason,
          detail: normalized.detail,
        },
        select: { id: true },
      });

      return {
        type: "ok",
        reportId: report.id,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        type: "error",
        status: 409,
        code: "ALREADY_REPORTED",
        message: "이미 신고한 요리입니다.",
      };
    }
    throw error;
  }
}
