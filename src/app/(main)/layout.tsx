import { headers } from "next/headers";
import type { ReactNode } from "react";
import AppShell from "@/widgets/app-shell/ui/app-shell";

type MeResponse = {
  status?: "GUEST" | "AUTH" | "ELIGIBLE" | "LIMITED";
};

async function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

async function getUserType(): Promise<"guest" | "auth"> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/me`, { cache: "no-store" });
    if (!response.ok) {
      return "guest";
    }
    const data = (await response.json()) as MeResponse;
    return data.status === "GUEST" || !data.status ? "guest" : "auth";
  } catch {
    return "guest";
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const userType = await getUserType();

  return <AppShell userType={userType}>{children}</AppShell>;
}
