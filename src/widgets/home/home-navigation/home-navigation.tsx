import Link from "next/link";

type NavKey = "home" | "create" | "feed" | "ladder" | "my";

type HomeNavigationProps = {
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
    ? "text-amber-300 text-sm font-bold"
    : "text-white/70 text-sm font-medium transition-colors hover:text-white";
}

export default function HomeNavigation({ userType, active = "home" }: HomeNavigationProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 py-4">
      <nav className="flex w-full max-w-[1200px] items-center justify-between gap-4 rounded-full border border-white/10 bg-neutral-900/90 px-6 py-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
            <span className="text-lg font-black">ACB</span>
          </div>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">
            AI Cooking Battle
          </span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.key} className={getNavLinkClass(item.key === active)} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {userType === "guest" ? (
            <Link
              className="hidden min-w-[84px] items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-neutral-900 shadow-[0_0_15px_rgba(251,191,36,0.35)] transition hover:bg-amber-300 sm:inline-flex"
              href="/start"
            >
              Log In
            </Link>
          ) : null}
          <div className="h-9 w-9 rounded-full border border-white/10 bg-neutral-700" />
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white md:hidden" type="button">
            <span className="text-sm font-semibold">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
