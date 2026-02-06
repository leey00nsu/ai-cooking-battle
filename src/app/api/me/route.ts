import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeUserStatus } from "@/lib/user-status/compute-user-status";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id?.toString().trim() ?? "";
  if (!userId) {
    return NextResponse.json({ status: "GUEST" });
  }
  const status = await computeUserStatus(userId);
  return NextResponse.json({ status });
}
