"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

type NavKey = "home" | "create" | "feed" | "ladder" | "my";

type AppHeaderProps = {
  userType: "guest" | "auth";
  active?: NavKey;
};

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "create", label: "Create", href: "/create" },
  { key: "feed", label: "Feed", href: "/feed" },
  { key: "ladder", label: "Ladder", href: "/ladder" },
  { key: "my", label: "My Kitchen", href: "/my" },
];

function getNavLinkClass(isActive: boolean) {
  return isActive
    ? "text-primary text-sm font-bold"
    : "text-white/70 text-sm font-medium transition-colors hover:text-white";
}

export default function AppHeader({ userType, active }: AppHeaderProps) {
  const pathname = usePathname();
  const resolvedActive = active ?? resolveActiveFromPath(pathname);

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 py-4">
      <nav className="flex w-full max-w-[1200px] items-center justify-between gap-4 rounded-full border border-white/10 bg-card/90 px-6 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="text-lg font-black">ACB</span>
          </div>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">
            AI Cooking Battle
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              className={getNavLinkClass(item.key === resolvedActive)}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {userType === "guest" ? (
            <Button asChild className="hidden min-w-[84px] sm:inline-flex" variant="nav" size="sm">
              <Link href="/start">Log In</Link>
            </Button>
          ) : null}
          <Avatar className="size-9 border border-white/10 bg-card">
            <AvatarFallback className="text-[10px] font-bold tracking-wide text-white/80">
              ME
            </AvatarFallback>
          </Avatar>
          <Button
            className="md:hidden"
            variant="outline"
            size="icon"
            type="button"
            aria-label="모바일 메뉴 열기"
            disabled
          >
            <span className="text-xs font-semibold">Menu</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}

function resolveActiveFromPath(pathname: string | null): NavKey {
  if (!pathname || pathname === "/") {
    return "home";
  }
  if (pathname.startsWith("/create")) {
    return "create";
  }
  if (pathname.startsWith("/feed")) {
    return "feed";
  }
  if (pathname.startsWith("/ladder")) {
    return "ladder";
  }
  if (pathname.startsWith("/my")) {
    return "my";
  }
  return "home";
}
