import { describe, expect, it } from "vitest";
import { decideProxyAction, LOGIN_TERMS_PATH } from "./proxy-decision";

const baseInput = {
  pathname: "/",
  search: "",
  isPublicPath: false,
  isLoginPath: false,
  hasUser: false,
  hasConsent: false,
};

const decide = (override: Partial<typeof baseInput>) =>
  decideProxyAction({ ...baseInput, ...override });

describe("decideProxyAction", () => {
  it("비로그인 사용자는 /login/terms에서 /login으로 리다이렉트된다", () => {
    const decision = decide({
      pathname: LOGIN_TERMS_PATH,
      isPublicPath: true,
    });

    expect(decision).toEqual({ type: "redirect", pathname: "/login", search: "" });
  });

  it("동의 완료 사용자는 /login/terms에서 /로 리다이렉트된다", () => {
    const decision = decide({
      pathname: LOGIN_TERMS_PATH,
      isPublicPath: true,
      hasUser: true,
      hasConsent: true,
    });

    expect(decision).toEqual({ type: "redirect", pathname: "/", search: "" });
  });

  it("미동의 사용자는 /login/terms 접근이 허용된다", () => {
    const decision = decide({
      pathname: LOGIN_TERMS_PATH,
      isPublicPath: true,
      hasUser: true,
      hasConsent: false,
    });

    expect(decision).toEqual({ type: "next" });
  });

  it("비로그인 사용자는 /login 접근이 허용된다", () => {
    const decision = decide({
      pathname: "/login",
      isLoginPath: true,
    });

    expect(decision).toEqual({ type: "next" });
  });

  it("동의 완료 사용자는 /login에서 /로 리다이렉트된다", () => {
    const decision = decide({
      pathname: "/login",
      isLoginPath: true,
      hasUser: true,
      hasConsent: true,
    });

    expect(decision).toEqual({ type: "redirect", pathname: "/", search: "" });
  });

  it("미동의 사용자는 /login에서 /login/terms로 리다이렉트된다", () => {
    const decision = decide({
      pathname: "/login",
      isLoginPath: true,
      hasUser: true,
      hasConsent: false,
    });

    expect(decision).toEqual({
      type: "redirect",
      pathname: LOGIN_TERMS_PATH,
      search: "",
    });
  });

  it("다른 공개 경로는 항상 허용된다", () => {
    const decision = decide({
      pathname: "/legal/privacy",
      isPublicPath: true,
    });

    expect(decision).toEqual({ type: "next" });
  });

  it("미동의 사용자는 보호 경로에서 returnTo와 함께 /login/terms로 리다이렉트된다", () => {
    const decision = decide({
      pathname: "/battle",
      search: "?sort=top",
      hasUser: true,
      hasConsent: false,
    });

    expect(decision).toEqual({
      type: "redirect",
      pathname: LOGIN_TERMS_PATH,
      search: `returnTo=${encodeURIComponent("/battle?sort=top")}`,
    });
  });

  it("동의 완료 사용자는 보호 경로 접근이 허용된다", () => {
    const decision = decide({
      pathname: "/battle",
      hasUser: true,
      hasConsent: true,
    });

    expect(decision).toEqual({ type: "next" });
  });
});
