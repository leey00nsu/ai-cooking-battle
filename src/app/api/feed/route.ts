import { NextResponse } from "next/server";
import { listDishFeed } from "@/entities/feed/api/list-dish-feed";

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

export async function GET(request: Request) {
  try {
    const limit = getLimit(request.url);
    const cursor = getCursor(request.url);
    const feed = await listDishFeed({ limit, cursor });
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
