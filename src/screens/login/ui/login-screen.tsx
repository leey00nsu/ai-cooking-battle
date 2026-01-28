"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import LoginLayout from "@/screens/login/ui/login-layout";
import { cn } from "@/shared/lib/utils";

const providers = [
  {
    id: "google",
    label: "Continue with Google",
    description: "Use your Google account.",
    className: "bg-white text-gray-900 hover:bg-white/90",
    badge: "G",
  },
  {
    id: "naver",
    label: "Sign in with Naver",
    description: "Fast login with Naver ID.",
    className: "bg-[#03C75A] text-white hover:bg-[#02b351]",
    badge: "N",
  },
  {
    id: "kakao",
    label: "Sign in with Kakao",
    description: "Chat-first, battle-ready.",
    className: "bg-[#FEE500] text-[#3A1D1D] hover:bg-[#ebd300]",
    badge: "K",
  },
] as const;

type ProviderId = (typeof providers)[number]["id"];

export default function LoginScreen() {
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: ProviderId) => {
    setPendingProvider(provider);
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
      });
    } catch (signInError) {
      console.error(signInError);
      setError("Failed to start sign in. Please try again.");
      setPendingProvider(null);
    }
  };

  return (
    <LoginLayout>
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

          <div className="mt-8 flex flex-col gap-3.5">
            {providers.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={cn(
                  "flex h-14 w-full items-center justify-between gap-4 rounded-2xl px-4 text-left font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                  provider.className,
                )}
                disabled={pendingProvider !== null}
                onClick={() => handleSignIn(provider.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-base font-semibold">
                    {provider.badge}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{provider.label}</p>
                    <p className="text-xs opacity-70">{provider.description}</p>
                  </div>
                </div>
                <span className="text-sm opacity-60">
                  {pendingProvider === provider.id ? "Connecting..." : "->"}
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <output className="mt-4 block text-center text-xs text-rose-200">{error}</output>
          ) : null}

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
    </LoginLayout>
  );
}
