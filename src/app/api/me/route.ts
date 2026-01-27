import { getMockMe } from "@/shared/api/mock-home-data";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getMockMe());
}

