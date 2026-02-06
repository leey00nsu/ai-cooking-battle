import { headers } from "next/headers";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import AppShell from "@/widgets/app-shell/ui/app-shell";

async function getUserType(): Promise<"guest" | "auth"> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id?.toString().trim() ?? "";
    return userId ? "auth" : "guest";
  } catch {
    return "guest";
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  const userType = await getUserType();

  return <AppShell userType={userType}>{children}</AppShell>;
}
