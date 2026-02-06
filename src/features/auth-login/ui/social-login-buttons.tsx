"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/shared/lib/utils";
import { GoogleIcon } from "@/shared/ui/brand-icons/google-icon";
import { KakaoIcon } from "@/shared/ui/brand-icons/kakao-icon";
import { NaverIcon } from "@/shared/ui/brand-icons/naver-icon";
import { Button } from "@/shared/ui/button";

const providers = [
  {
    id: "google",
    label: "Sign in With Google",
    className: "bg-white text-gray-900 hover:bg-white/90 hover:text-gray-900",
  },
  {
    id: "naver",
    label: "Sign in With Naver",
    className: "bg-[#03C75A] text-white hover:bg-[#02b351] hover:text-white",
  },
  {
    id: "kakao",
    label: "Sign in With Kakao",
    className: "bg-[#FEE500] text-[#3A1D1D] hover:bg-[#ebd300] hover:text-[#3A1D1D]",
  },
] as const;

type ProviderId = (typeof providers)[number]["id"];

type EnabledProviders = Record<ProviderId, boolean>;

type SocialLoginButtonsProps = {
  callbackURL: string;
  newUserCallbackURL: string;
  enabledProviders: EnabledProviders;
};

export default function SocialLoginButtons({
  callbackURL,
  newUserCallbackURL,
  enabledProviders,
}: SocialLoginButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (provider: ProviderId) => {
    if (!enabledProviders[provider]) {
      return;
    }
    setPendingProvider(provider);
    setError(null);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL,
        newUserCallbackURL,
      });
    } catch (signInError) {
      console.error(signInError);
      setError("Failed to start sign in. Please try again.");
      setPendingProvider(null);
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-col gap-3.5">
        {providers.map((provider) => {
          const isEnabled = enabledProviders[provider.id];
          const isDisabled = pendingProvider !== null || !isEnabled;
          const statusLabel = !isEnabled
            ? "준비중"
            : pendingProvider === provider.id
              ? "Connecting..."
              : "->";

          return (
            <Button
              key={provider.id}
              type="button"
              variant="ghost"
              className={cn(
                "flex h-14 w-full items-center justify-between gap-4 rounded-2xl px-4 text-left font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                "disabled:cursor-not-allowed disabled:opacity-60",
                provider.className,
              )}
              disabled={isDisabled}
              onClick={() => handleSignIn(provider.id)}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center">
                  {provider.id === "google" ? <GoogleIcon /> : null}
                  {provider.id === "naver" ? <NaverIcon /> : null}
                  {provider.id === "kakao" ? <KakaoIcon /> : null}
                </span>
                <div>
                  <p className="text-sm font-semibold">{provider.label}</p>
                </div>
              </div>
              <span className="text-sm opacity-60">{statusLabel}</span>
            </Button>
          );
        })}
      </div>

      {error ? (
        <output className="mt-4 block text-center text-xs text-rose-200">{error}</output>
      ) : null}
    </>
  );
}
