import type { ReactNode } from "react";

type LoginLayoutProps = {
  children: ReactNode;
};

export default function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(244,140,37,0.22),transparent_55%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_95%_5%,rgba(255,255,255,0.08),transparent_60%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[140px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-[120px]"
        aria-hidden="true"
      />

      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary shadow-[var(--shadow-glow-sm)]">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <title>AI Cooking Battle</title>
              <path
                d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">AI Cooking</p>
            <p className="text-lg font-semibold tracking-tight">Battle</p>
          </div>
        </div>
        <a
          className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 sm:flex"
          href="mailto:support@aicookingbattle.com"
        >
          Help Center
        </a>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-120px)] items-center justify-center px-4 pb-14 pt-6">
        {children}
      </main>

      <footer className="relative z-10 pb-8 text-center text-xs text-white/30">
        <p>© 2026 AI Cooking Battle. All rights reserved.</p>
      </footer>
    </div>
  );
}
