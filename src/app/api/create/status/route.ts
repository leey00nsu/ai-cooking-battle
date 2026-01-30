import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

  return NextResponse.json({
    ok: true,
    status: "PROCESSING",
    imageUrl: null,
  });
}
