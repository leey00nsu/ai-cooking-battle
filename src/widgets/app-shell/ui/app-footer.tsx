import Link from "next/link";

export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-white/5 bg-card/50 py-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-white/40">
          <span className="font-bold">AI Cooking Battle</span>
          <span>© 2026</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            className="text-sm text-white/40 transition-colors hover:text-white"
            href="/legal/terms"
          >
            Terms
          </Link>
          <Link
            className="text-sm text-white/40 transition-colors hover:text-white"
            href="/legal/privacy"
          >
            Privacy
          </Link>
          <Link className="text-sm text-white/40 transition-colors hover:text-white" href="/feed">
            Community
          </Link>
        </div>
      </div>
    </footer>
  );
}
