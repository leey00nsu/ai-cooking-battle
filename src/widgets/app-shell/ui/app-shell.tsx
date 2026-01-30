import type { ReactNode } from "react";
import AppFooter from "@/widgets/app-shell/ui/app-footer";
import AppHeader from "@/widgets/app-shell/ui/app-header";

type AppShellProps = {
  children: ReactNode;
  userType: "guest" | "auth";
};

export default function AppShell({ children, userType }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader userType={userType} />
      {children}
      <AppFooter />
    </div>
  );
}
