import { type NextRequest, NextResponse } from "next/server";
import { sleep } from "@/shared/lib/sleep";

export async function GET(request: NextRequest) {
  await sleep(2000);
  const requestId = request.nextUrl.searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_REQUEST_ID",
        message: "requestId is required.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      code: "SAFETY_CHECK_FAILED",
      message: "Safety check failed.",
    },
    { status: 422 },
  );
}
