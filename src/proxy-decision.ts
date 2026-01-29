import { resolveReturnTo } from "@/shared/lib/return-to";

export const LOGIN_TERMS_PATH = "/login/terms";

export type ProxyDecision =
  | {
      type: "next";
    }
  | {
      type: "redirect";
      pathname: string;
      search?: string;
    };

export type ProxyDecisionInput = {
  pathname: string;
  search: string;
  isPublicPath: boolean;
  isLoginPath: boolean;
  hasUser: boolean;
  hasConsent: boolean;
};

export function buildTermsReturnToSearch(pathname: string, search: string) {
  const returnTo = resolveReturnTo(`${pathname}${search}`) ?? "/";
  return `returnTo=${encodeURIComponent(returnTo)}`;
}

export function decideProxyAction(input: ProxyDecisionInput): ProxyDecision {
  const { pathname, search, isPublicPath, isLoginPath, hasUser, hasConsent } = input;

  if (pathname === LOGIN_TERMS_PATH) {
    if (!hasUser) {
      return { type: "redirect", pathname: "/login", search: "" };
    }
    if (hasConsent) {
      return { type: "redirect", pathname: "/", search: "" };
    }
    return { type: "next" };
  }

  if (isPublicPath) {
    return { type: "next" };
  }

  if (isLoginPath) {
    if (!hasUser) {
      return { type: "next" };
    }
    return {
      type: "redirect",
      pathname: hasConsent ? "/" : LOGIN_TERMS_PATH,
      search: "",
    };
  }

  if (!hasUser || hasConsent) {
    return { type: "next" };
  }

  return {
    type: "redirect",
    pathname: LOGIN_TERMS_PATH,
    search: buildTermsReturnToSearch(pathname, search),
  };
}
