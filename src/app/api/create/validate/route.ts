import { NextResponse } from "next/server";

type ValidatePayload = {
  prompt?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ValidatePayload;

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_REQUIRED",
        message: "Prompt is required.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    normalizedPrompt: body.prompt.trim(),
  });
}
