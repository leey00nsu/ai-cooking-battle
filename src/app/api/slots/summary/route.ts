import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // TODO: DB 연동 시 실제 카운터 조회로 교체
  return NextResponse.json({
    freeLimit: 30,
    freeUsedCount: 0,
    adLimit: 30,
    adUsedCount: 0,
  });
}
