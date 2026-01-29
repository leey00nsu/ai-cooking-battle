import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isAuthApiPath,
  isLoginPath,
  isPublicPath,
  isStaticAssetPath,
} from "@/shared/lib/proxy-paths";
import { resolveReturnTo } from "@/shared/lib/return-to";

type SessionCache = Awaited<ReturnType<typeof getCookieCache>>;

async function getSessionCache(request: NextRequest) {
  let sessionCache: SessionCache = await getCookieCache(request, {
    secret: process.env.BETTER_AUTH_SECRET,
    strategy: "jwe",
  });

  if (!sessionCache) {
    const sessionToken = getSessionCookie(request);
    if (sessionToken) {
      const sessionUrl = request.nextUrl.clone();
      sessionUrl.pathname = "/api/auth/get-session";
      sessionUrl.search = "disableCookieCache=true";
      const response = await fetch(sessionUrl, {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });
      if (response.ok) {
        sessionCache = (await response.json()) as SessionCache;
      }
    }
  }

  return sessionCache;
}

function hasConsent(user: NonNullable<SessionCache>["user"]) {
  return Boolean(user.termsAcceptedAt) && Boolean(user.termsAcceptedVersion);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isStaticAssetPath(pathname) || isAuthApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!isLoginPath(pathname) && isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCache = await getSessionCache(request);
  const user = sessionCache?.user;
  if (isLoginPath(pathname)) {
    if (!user) {
      return NextResponse.next();
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = hasConsent(user) ? "/" : "/login/terms";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.next();
  }

  if (hasConsent(user)) {
    return NextResponse.next();
  }

  const returnTo = resolveReturnTo(`${pathname}${search}`) ?? "/";
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login/terms";
  redirectUrl.search = `returnTo=${encodeURIComponent(returnTo)}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"],
};
