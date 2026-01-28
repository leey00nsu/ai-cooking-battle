"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import LoginLayout from "@/screens/login/ui/login-layout";
import { cn } from "@/shared/lib/utils";

const TERMS_VERSION = "2026-01-28";

type LoginTermsScreenProps = {
  userName?: string | null;
};

export default function LoginTermsScreen({ userName }: LoginTermsScreenProps) {
  const router = useRouter();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agreeAll = agreeTerms && agreePrivacy;

  const handleAllToggle = (nextValue: boolean) => {
    setAgreeTerms(nextValue);
    setAgreePrivacy(nextValue);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agreeAll) {
      setError("Please accept the required terms to continue.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await authClient.updateUser({
        termsAcceptedAt: new Date().toISOString(),
        termsAcceptedVersion: TERMS_VERSION,
      });
      router.replace("/");
    } catch (updateError) {
      console.error(updateError);
      setError("We couldn't save your consent. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <LoginLayout>
      <div className="w-full max-w-[520px]">
        <div className="rounded-[32px] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">
              Agreement
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {userName ? `Welcome back, ${userName}` : "Almost there"}
            </h2>
            <p className="text-sm text-white/70">
              Review our terms so you can start battling right away.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  className="mt-0.5 h-4 w-4 rounded border-white/40 bg-transparent text-primary focus:ring-primary/60"
                  type="checkbox"
                  checked={agreeAll}
                  onChange={(event) => handleAllToggle(event.target.checked)}
                />
                <span className="text-white/90">I agree to all terms and policies</span>
              </label>
              <div className="my-4 h-px bg-white/10" />
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  className="mt-0.5 h-4 w-4 rounded border-white/40 bg-transparent text-primary focus:ring-primary/60"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) => setAgreeTerms(event.target.checked)}
                  required
                />
                <span className="text-white/70">
                  <a className="underline underline-offset-4" href="/legal/terms">
                    Terms of Service
                  </a>
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Required
                  </span>
                </span>
              </label>
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  className="mt-0.5 h-4 w-4 rounded border-white/40 bg-transparent text-primary focus:ring-primary/60"
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(event) => setAgreePrivacy(event.target.checked)}
                  required
                />
                <span className="text-white/70">
                  <a className="underline underline-offset-4" href="/legal/privacy">
                    Privacy Policy
                  </a>
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Required
                  </span>
                </span>
              </label>
            </div>

            {error ? <output className="block text-xs text-rose-200">{error}</output> : null}

            <button
              type="submit"
              className={cn(
                "mt-2 flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-r from-primary to-orange-600 text-base font-semibold text-black transition",
                "hover:shadow-[0_0_25px_rgba(244,140,37,0.35)]",
                "disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-white/50 disabled:shadow-none",
              )}
              disabled={!agreeAll || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Agree and Continue"}
            </button>

            <p className="text-center text-xs text-white/40">
              By continuing, you acknowledge our community guidelines.
            </p>
          </form>
        </div>
      </div>
    </LoginLayout>
  );
}
