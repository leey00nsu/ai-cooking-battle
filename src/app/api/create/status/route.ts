import { type NextRequest, NextResponse } from "next/server";
import { getGuestUserId } from "@/lib/guest-user";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  const idempotencyKey = request.nextUrl.searchParams.get("idempotencyKey");

  if (!requestId && !idempotencyKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_REQUEST_ID",
        message: "requestId or idempotencyKey is required.",
      },
      { status: 400 },
    );
  }

  const userId = await getGuestUserId();

  const createRequest = requestId
    ? await prisma.createRequest.findUnique({ where: { id: requestId } })
    : await prisma.createRequest.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey: idempotencyKey ?? "",
          },
        },
      });

  if (!createRequest) {
    return NextResponse.json(
      {
        ok: false,
        code: "REQUEST_NOT_FOUND",
        message: "Request not found.",
      },
      { status: 404 },
    );
  }

  if (createRequest.status === "FAILED") {
    return NextResponse.json(
      {
        ok: false,
        code: "GENERATE_FAILED",
        message: "Generation failed.",
      },
      { status: 422 },
    );
  }

  const status = createRequest.status === "DONE" ? "DONE" : "PROCESSING";

  return NextResponse.json({
    ok: true,
    status,
    imageUrl: createRequest.imageUrl ?? null,
  });
}
