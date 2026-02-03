import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasReservationExpired, reclaimSlotReservation } from "@/lib/slot-recovery";

const AUTO_COMPLETE_MS = 1000;

export const runtime = "nodejs";

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

  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const createRequest = requestId
    ? await prisma.createRequest.findFirst({ where: { id: requestId, userId } })
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

  const reservation = await prisma.slotReservation.findUnique({
    where: { id: createRequest.reservationId },
  });

  if (reservation && hasReservationExpired(reservation)) {
    await reclaimSlotReservation(reservation);
    return NextResponse.json(
      {
        ok: false,
        code: "RESERVATION_EXPIRED",
        message: "Reservation expired.",
      },
      { status: 410 },
    );
  }

  if (createRequest.status !== "DONE" && createRequest.status !== "FAILED") {
    const elapsedMs = Date.now() - createRequest.createdAt.getTime();
    if (elapsedMs > AUTO_COMPLETE_MS) {
      const updated = await prisma.createRequest.update({
        where: { id: createRequest.id },
        data: { status: "DONE" },
      });
      return NextResponse.json({
        ok: true,
        status: "DONE",
        imageUrl: updated.imageUrl ?? null,
      });
    }
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
