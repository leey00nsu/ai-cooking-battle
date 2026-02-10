import { NextResponse } from "next/server";
import { getDishDetail } from "@/entities/dish/api/get-dish-detail";

export const runtime = "nodejs";

function toErrorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
    },
    { status },
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const result = await getDishDetail(id);

    if (result.type === "error") {
      if (result.code === "INVALID_DISH_ID") {
        return toErrorResponse(result.code, result.message, 400);
      }
      if (result.code === "DISH_NOT_FOUND") {
        return toErrorResponse(result.code, result.message, 404);
      }
      if (result.code === "DISH_RESTRICTED") {
        return toErrorResponse(result.code, result.message, 403);
      }
      return toErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
    }

    return NextResponse.json({
      ok: true,
      dish: result.dish,
      author: result.author,
      theme: result.theme,
      score: result.score,
    });
  } catch (error) {
    console.error("[dish.detail] failed to fetch dish detail", error);
    return toErrorResponse("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500);
  }
}
