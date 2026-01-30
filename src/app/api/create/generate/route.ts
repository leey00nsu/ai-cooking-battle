import { NextResponse } from "next/server";

type GeneratePayload = {
  reservationId?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GeneratePayload;

  if (!body.reservationId || !body.prompt) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_FIELDS",
        message: "reservationId and prompt are required.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: "stub-request",
    status: "QUEUED",
  });
}
