import { NextResponse } from "next/server";
import { sleep } from "@/shared/lib/sleep";

type GeneratePayload = {
  reservationId?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  await sleep(2000);
  const body = (await request.json().catch(() => ({}))) as GeneratePayload;

  const prompt = (body.prompt ?? "").toString().trim();

  if (!body.reservationId || prompt === "") {
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
