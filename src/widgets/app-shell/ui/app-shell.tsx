import type { ReactNode } from "react";
import AppFooter from "@/widgets/app-shell/ui/app-footer";
import AppHeader from "@/widgets/app-shell/ui/app-header";

type AppShellProps = {
  children: ReactNode;
  userType: "guest" | "auth";
};

export default function AppShell({ children, userType }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-white">
      <AppHeader userType={userType} />
      <main className="flex-1">{children}</main>
      <AppFooter />
    </div>
  );
}
