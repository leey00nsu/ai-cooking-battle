import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDayKeyForKST } from "@/shared/lib/day-key";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

  const dayKey = formatDayKeyForKST();

  try {
    const [user, activeEntry, dishes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { representativeDishId: true },
      }),
      prisma.activeEntry.findUnique({
        where: { userId },
        select: { isActive: true, dishId: true },
      }),
      prisma.dish.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          isHidden: true,
          createdAt: true,
          dayScores: {
            where: { dayKey },
            select: { totalScore: true },
            take: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      representativeDishId: user?.representativeDishId ?? null,
      isActive: Boolean(activeEntry?.isActive),
      dishes: dishes.map((dish) => ({
        id: dish.id,
        prompt: dish.prompt,
        imageUrl: dish.imageUrl,
        isHidden: dish.isHidden,
        createdAt: dish.createdAt.toISOString(),
        dayScoreToday: dish.dayScores[0]?.totalScore ?? null,
      })),
    });
  } catch (error) {
    console.error("[my-kitchen] failed to fetch kitchen data", error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
