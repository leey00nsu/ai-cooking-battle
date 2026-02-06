import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Payload = {
  dishId?: string;
  clear?: boolean;
};

type Result =
  | { type: "ok"; representativeDishId: string | null }
  | { type: "error"; status: number; code: string; message: string };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Payload;
  const clearRepresentative = body.clear === true;
  const dishId = body.dishId?.trim() ?? "";
  if (!clearRepresentative && !dishId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_DISH_ID", message: "dishId is required." },
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
    if (clearRepresentative) {
      const user = await tx.user.update({
        where: { id: userId },
        data: { representativeDishId: null },
        select: { representativeDishId: true },
      });

      await tx.activeEntry.deleteMany({
        where: { userId },
      });

      return { type: "ok", representativeDishId: user.representativeDishId };
    }

    const dish = await tx.dish.findFirst({
      where: { id: dishId, userId },
      select: { id: true },
    });
    if (!dish) {
      return { type: "error", status: 404, code: "DISH_NOT_FOUND", message: "Dish not found." };
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { representativeDishId: dish.id },
      select: { representativeDishId: true },
    });

    const existingEntry = await tx.activeEntry.findUnique({
      where: { userId },
      select: { userId: true },
    });
    if (existingEntry) {
      await tx.activeEntry.update({
        where: { userId },
        data: { dishId: dish.id },
        select: { userId: true },
      });
    }

    return { type: "ok", representativeDishId: user.representativeDishId ?? dish.id };
  });

  if (result.type === "error") {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, representativeDishId: result.representativeDishId });
}
