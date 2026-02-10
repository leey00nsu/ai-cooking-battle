import { NextResponse } from "next/server";
import { createReport } from "@/entities/report/api/create-report";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type ReportPayload = {
  targetDishId?: string;
  reason?: string;
  detail?: string;
};

function normalizePayload(body: ReportPayload) {
  return {
    targetDishId: body.targetDishId?.toString().trim() ?? "",
    reason: body.reason?.toString().trim() ?? "",
    detail: body.detail?.toString().trim() || null,
  };
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as ReportPayload;
  const normalized = normalizePayload(body);
  if (!normalized.targetDishId || !normalized.reason) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_FIELDS",
        message: "targetDishId and reason are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createReport({
      reporterId: userId,
      targetDishId: normalized.targetDishId,
      reason: normalized.reason,
      detail: normalized.detail,
    });

    if (result.type === "error") {
      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          message: result.message,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      reportId: result.reportId,
    });
  } catch (error) {
    console.error("[reports] failed to create report", error);
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
