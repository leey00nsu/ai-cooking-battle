import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decideProxyAction } from "@/proxy-decision";
import {
  isAuthApiPath,
  isLoginPath,
  isPublicPath,
  isStaticAssetPath,
} from "@/shared/lib/proxy-paths";

type SessionCache = Awaited<ReturnType<typeof getCookieCache>>;
type SessionUser = NonNullable<SessionCache>["user"];
type ConsentState = {
  hasUser: boolean;
  hasConsent: boolean;
};

function getBetterAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("[proxy] Missing BETTER_AUTH_SECRET for session cache.");
  }
  return secret;
}

async function getSessionCache(request: NextRequest) {
  let sessionCache: SessionCache = await getCookieCache(request, {
    secret: getBetterAuthSecret(),
    strategy: "jwe",
  });

  if (!sessionCache) {
    const sessionToken = getSessionCookie(request);
    if (sessionToken) {
      sessionCache = await fetchSessionFromDb(request);
    }
  }

  return sessionCache;
}

async function fetchSessionFromDb(request: NextRequest) {
  const sessionUrl = request.nextUrl.clone();
  sessionUrl.pathname = "/api/auth/get-session";
  sessionUrl.search = "disableCookieCache=true";
  const response = await fetch(sessionUrl, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as SessionCache;
}

function hasConsent(user: SessionUser) {
  return Boolean(user.termsAcceptedAt) && Boolean(user.termsAcceptedVersion);
}

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = search;
  return NextResponse.redirect(redirectUrl);
}

async function resolveConsentState(request: NextRequest): Promise<ConsentState> {
  const sessionCache = await getSessionCache(request);
  const cachedUser = sessionCache?.user ?? null;
  if (!cachedUser) {
    return { hasUser: false, hasConsent: false };
  }
  if (hasConsent(cachedUser)) {
    return { hasUser: true, hasConsent: true };
  }
  const dbSession = await fetchSessionFromDb(request);
  const dbUser = dbSession?.user ?? null;
  if (dbUser && hasConsent(dbUser)) {
    return { hasUser: true, hasConsent: true };
  }
  return { hasUser: true, hasConsent: false };
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isStaticAssetPath(pathname) || isAuthApiPath(pathname)) {
    return NextResponse.next();
  }

  const consentState = await resolveConsentState(request);
  const decision = decideProxyAction({
    pathname,
    search,
    isPublicPath: isPublicPath(pathname),
    isLoginPath: isLoginPath(pathname),
    hasUser: consentState.hasUser,
    hasConsent: consentState.hasConsent,
  });

  if (decision.type === "next") {
    return NextResponse.next();
  }

  return redirectTo(request, decision.pathname, decision.search ?? "");
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
