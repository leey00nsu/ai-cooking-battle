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
  try {
    const status = await computeUserStatus(userId);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("[api/me] failed to compute user status", error);
    return NextResponse.json({ status: "AUTH" }, { status: 500 });
  }
}
