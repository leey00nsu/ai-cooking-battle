import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Payload = {
  isActive?: boolean;
};

type Result =
  | { type: "ok"; isActive: boolean; dishId: string }
  | { type: "error"; status: number; code: string; message: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, code: "INVALID_IS_ACTIVE", message: "isActive must be a boolean." },
      { status: 400 },
    );
  }

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

  const result = await prisma.$transaction<Result>(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { representativeDishId: true },
    });
    const representativeDishId = user?.representativeDishId ?? null;
    if (!representativeDishId) {
      return {
        type: "error",
        status: 400,
        code: "REPRESENTATIVE_REQUIRED",
        message: "대표작이 필요합니다.",
      };
    }

    // Revalidate representative dish in the same transaction to reduce
    // interleaving issues with concurrent "clear representative" requests.
    const latestUser = await tx.user.findUnique({
      where: { id: userId },
      select: { representativeDishId: true },
    });
    if (latestUser?.representativeDishId !== representativeDishId) {
      return {
        type: "error",
        status: 400,
        code: "REPRESENTATIVE_REQUIRED",
        message: "대표작이 필요합니다.",
      };
    }

    const entry = await tx.activeEntry.upsert({
      where: { userId },
      update: {
        dishId: representativeDishId,
        isActive: body.isActive,
      },
      create: {
        userId,
        dishId: representativeDishId,
        isActive: body.isActive,
      },
      select: { isActive: true, dishId: true },
    });

    return { type: "ok", isActive: entry.isActive, dishId: entry.dishId };
  });

  if (result.type === "error") {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, isActive: result.isActive, dishId: result.dishId });
}
