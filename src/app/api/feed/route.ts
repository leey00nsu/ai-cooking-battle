import { NextResponse } from "next/server";
import { listDishFeed } from "@/entities/feed/api/list-dish-feed";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function getLimit(url: string) {
  const { searchParams } = new URL(url);
  const raw = Number(searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.floor(raw);
}

function getCursor(url: string) {
  const { searchParams } = new URL(url);
  const raw = searchParams.get("cursor")?.trim();
  return raw ? raw : null;
}

function getBooleanParam(url: string, key: string) {
  const { searchParams } = new URL(url);
  return searchParams.get(key)?.trim() === "true";
}

function getStringParam(url: string, key: string) {
  const { searchParams } = new URL(url);
  const raw = searchParams.get(key)?.trim();
  return raw ? raw : null;
}

export async function GET(request: Request) {
  try {
    const limit = getLimit(request.url);
    const cursor = getCursor(request.url);
    const mine = getBooleanParam(request.url, "mine");
    const excludeBots = getBooleanParam(request.url, "excludeBots");
    const search = getStringParam(request.url, "search");
    const sort = getStringParam(request.url, "sort");

    const session = mine ? await auth.api.getSession({ headers: request.headers }) : null;
    const userId = session?.user?.id?.toString().trim() ?? "";

    if (mine && !userId) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }

    const feed = await listDishFeed({
      limit,
      cursor,
      mine,
      excludeBots,
      userId,
      search,
      sort,
    });
    return NextResponse.json(feed);
  } catch (error) {
    console.error("[feed] failed to list dish feed", error);
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "피드 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
