import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const REQUIRED_ENV = ["BETTER_AUTH_URL", "BETTER_AUTH_SECRET"] as const;

function getRequiredEnv<const Keys extends readonly string[]>(keys: Keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[auth] Missing required env: ${missing.join(", ")}`);
  }
  return Object.fromEntries(keys.map((key) => [key, process.env[key] as string])) as Record<
    Keys[number],
    string
  >;
}

const env = getRequiredEnv(REQUIRED_ENV);

const readEnv = (key: string) => process.env[key]?.trim() ?? "";

const getOptionalProvider = (name: string, idKey: string, secretKey: string) => {
  const clientId = readEnv(idKey);
  const clientSecret = readEnv(secretKey);
  if (!clientId || !clientSecret) {
    const missing = [!clientId ? idKey : null, !clientSecret ? secretKey : null].filter(
      (key): key is string => Boolean(key),
    );
    console.warn(
      `[auth] ${name} OAuth 비활성화: ${missing.length ? `누락된 env(${missing.join(", ")})` : "설정 없음"}`,
    );
    return null;
  }
  return { clientId, clientSecret };
};

const googleProvider = getOptionalProvider("Google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
const naverProvider = getOptionalProvider("Naver", "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET");
const kakaoProvider = getOptionalProvider("Kakao", "KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET");

export const enabledProviders = {
  google: Boolean(googleProvider),
  naver: Boolean(naverProvider),
  kakao: Boolean(kakaoProvider),
};

const socialProviders = {
  ...(googleProvider ? { google: googleProvider } : {}),
  ...(naverProvider ? { naver: naverProvider } : {}),
  ...(kakaoProvider ? { kakao: kakaoProvider } : {}),
};

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    cookieCache: {
      enabled: true,
      strategy: "jwe",
      refreshCache: false,
    },
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  user: {
    additionalFields: {
      termsAcceptedAt: {
        type: "string",
        required: false,
      },
      termsAcceptedVersion: {
        type: "string",
        required: false,
      },
    },
  },
});
