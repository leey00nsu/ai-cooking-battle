// Proxy(전역 게이트)에서 사용하는 경로 분류 규칙
const PUBLIC_PATHS = new Set(["/login/terms", "/legal/terms", "/legal/privacy"]);
const STATIC_PREFIXES = ["/_next"];
const STATIC_FILES = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);

export function isAuthApiPath(pathname: string) {
  return pathname.startsWith("/api/auth");
}

export function isStaticAssetPath(pathname: string) {
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (STATIC_FILES.has(pathname)) {
    return true;
  }
  if (pathname.includes(".")) {
    return true;
  }
  return false;
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export function isLoginPath(pathname: string) {
  return pathname === "/login";
}
