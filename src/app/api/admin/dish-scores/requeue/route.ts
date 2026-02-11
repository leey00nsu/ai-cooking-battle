import { NextResponse } from "next/server";
import { requeueDishScores } from "@/entities/dish/api/requeue-dish-scores";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type RequeuePayload = {
  dayKey?: string;
  dishId?: string;
  limit?: number;
};

function parseCsvEnv(key: string) {
  return (process.env[key] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAdminUser(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  const userId = session?.user?.id?.toString().trim() ?? "";
  const userEmail = session?.user?.email?.toString().trim().toLowerCase() ?? "";

  const adminIds = new Set(parseCsvEnv("ADMIN_USER_IDS"));
  const adminEmails = new Set(parseCsvEnv("ADMIN_USER_EMAILS").map((email) => email.toLowerCase()));

  return (userId && adminIds.has(userId)) || (userEmail && adminEmails.has(userEmail));
}

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";

  if (!userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  if (!isAdminUser(session)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "관리자 권한이 필요합니다." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    userId,
  };
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = (await request.json().catch(() => ({}))) as RequeuePayload;
  const result = await requeueDishScores({
    dayKey: body.dayKey,
    dishId: body.dishId,
    limit: body.limit,
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

  console.info("[admin.dish-scores.requeue] requested", {
    actorUserId: admin.userId,
    dayKey: result.dayKey,
    requested: result.requested,
    enqueued: result.enqueued,
    skipped: result.skipped,
    failed: result.failed,
  });

  return NextResponse.json(
    {
      ok: true,
      dayKey: result.dayKey,
      requested: result.requested,
      enqueued: result.enqueued,
      skipped: result.skipped,
      failed: result.failed,
    },
    { status: 202 },
  );
}
