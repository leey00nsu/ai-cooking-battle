import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueBotSeedJob } from "@/lib/queue/bot-seed-job";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SeedPayload = {
  dayKey?: string;
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

function resolveDayKey(input?: string | null) {
  const dayKey = input?.toString().trim() || formatDayKeyForKST();
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return null;
  }
  return dayKey;
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
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

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const dayKey = resolveDayKey(new URL(request.url).searchParams.get("dayKey"));
  if (!dayKey) {
    return NextResponse.json(
      { ok: false, code: "INVALID_DAY_KEY", message: "dayKey format must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const seedRun = await prisma.botSeedRun.findUnique({
    where: { dayKey },
    select: {
      id: true,
      dayKey: true,
      triggerType: true,
      status: true,
      selectedCount: true,
      successCount: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
      seedItems: {
        orderBy: [{ selectedOrder: "asc" }, { attempt: "asc" }],
        select: {
          id: true,
          personaKey: true,
          selectedOrder: true,
          attempt: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          persona: {
            select: {
              displayName: true,
              styleGroup: true,
            },
          },
          dish: {
            select: {
              id: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!seedRun) {
    return NextResponse.json(
      { ok: false, code: "SEED_RUN_NOT_FOUND", message: "Seed run not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    seedRun: {
      id: seedRun.id,
      dayKey: seedRun.dayKey,
      triggerType: seedRun.triggerType,
      status: seedRun.status,
      selectedCount: seedRun.selectedCount,
      successCount: seedRun.successCount,
      startedAt: serializeDate(seedRun.startedAt),
      finishedAt: serializeDate(seedRun.finishedAt),
      updatedAt: seedRun.updatedAt.toISOString(),
      items: seedRun.seedItems.map((item) => ({
        id: item.id,
        personaKey: item.personaKey,
        personaDisplayName: item.persona.displayName,
        styleGroup: item.persona.styleGroup,
        selectedOrder: item.selectedOrder,
        attempt: item.attempt,
        status: item.status,
        dishId: item.dish?.id ?? null,
        dishImageUrl: item.dish?.imageUrl ?? null,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = (await request.json().catch(() => ({}))) as SeedPayload;
  const dayKey = resolveDayKey(body.dayKey);
  if (!dayKey) {
    return NextResponse.json(
      { ok: false, code: "INVALID_DAY_KEY", message: "dayKey format must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const current = await prisma.botSeedRun.findUnique({
    where: { dayKey },
    select: { status: true },
  });
  if (current?.status === "RUNNING") {
    return NextResponse.json(
      {
        ok: false,
        code: "SEED_RUN_IN_PROGRESS",
        message: "같은 dayKey의 bot-seed 작업이 이미 실행 중입니다.",
      },
      { status: 409 },
    );
  }

  const jobId = await enqueueBotSeedJob({ dayKey, triggerType: "ADMIN" }, { singleton: false });
  console.info("[admin.bots.seed] enqueue", {
    actorUserId: admin.userId,
    dayKey,
    triggerType: "ADMIN",
    jobId: jobId ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      dayKey,
      triggerType: "ADMIN",
      jobId: jobId ?? null,
    },
    { status: 202 },
  );
}
