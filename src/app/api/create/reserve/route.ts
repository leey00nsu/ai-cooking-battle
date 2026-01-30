import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    slotType: "free",
    reservationId: "stub-reservation",
    expiresInSeconds: 300,
  });
}
