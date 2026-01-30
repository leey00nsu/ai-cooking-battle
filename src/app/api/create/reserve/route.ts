import { NextResponse } from "next/server";
import { sleep } from "@/shared/lib/sleep";

export async function POST() {
  await sleep(2000);
  return NextResponse.json({
    ok: true,
    slotType: "free",
    reservationId: "stub-reservation",
    expiresInSeconds: 300,
  });
}
