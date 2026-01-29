import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveReturnTo } from "@/shared/lib/return-to";

export function buildLoginUrl(returnTo?: string | null) {
  const safeReturnTo = resolveReturnTo(returnTo);
  if (!safeReturnTo) {
    return "/login";
  }
  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `/login?${params.toString()}`;
}

export async function requireAuth(returnTo?: string | null) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect(buildLoginUrl(returnTo));
  }

  return session;
}

export async function requireConsentedUser(returnTo?: string | null) {
  const session = await requireAuth(returnTo);
  const hasConsent =
    Boolean(session.user.termsAcceptedAt) && Boolean(session.user.termsAcceptedVersion);

  if (!hasConsent) {
    const safeReturnTo = resolveReturnTo(returnTo) ?? "/";
    const params = new URLSearchParams({ returnTo: safeReturnTo });
    redirect(`/login/terms?${params.toString()}`);
  }

  return session;
}
