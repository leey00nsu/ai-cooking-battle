import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasReservationExpired, reclaimSlotReservation } from "@/lib/slot-recovery";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId");
  const idempotencyKey = url.searchParams.get("idempotencyKey");

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

  if (reservation && reservation.status === "RESERVED" && hasReservationExpired(reservation)) {
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

  if (createRequest.status === "FAILED") {
    return NextResponse.json({
      ok: false,
      code: "GENERATE_FAILED",
      message: "생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      retryable: true,
    });
  }

  return NextResponse.json({
    ok: true,
    status: createRequest.status,
    dishId: createRequest.dishId ?? null,
    imageUrl: createRequest.imageUrl ?? null,
  });
}
