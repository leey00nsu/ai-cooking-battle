"use client";

import { useSearchParams } from "next/navigation";
import SocialLoginButtons from "@/features/auth-login/ui/social-login-buttons";
import { resolveReturnTo } from "@/shared/lib/return-to";
import AuthShell from "@/widgets/auth-shell/ui/auth-shell";

export default function LoginScreen() {
  const searchParams = useSearchParams();
  const returnTo = resolveReturnTo(searchParams.get("returnTo"));
  const callbackURL = returnTo ?? "/";
  const newUserCallbackURL = returnTo
    ? `/login/terms?returnTo=${encodeURIComponent(returnTo)}`
    : "/login/terms";

  return (
    <AuthShell>
      <div className="w-full max-w-[520px]">
        <div className="rounded-[32px] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
              Onboarding
            </p>
            <h2 className="text-4xl font-bold tracking-tight">Welcome, Chef!</h2>
            <p className="text-base text-white/70">
              Sign in to craft dishes, join battles, and climb today&apos;s board.
            </p>
          </div>

          <SocialLoginButtons callbackURL={callbackURL} newUserCallbackURL={newUserCallbackURL} />

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              Guest Notice
            </p>
            <p className="mt-2 text-sm text-white/70">
              Guests can explore today&apos;s theme and rankings, but creation and battle
              submissions require login.
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
