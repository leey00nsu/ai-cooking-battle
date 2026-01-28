import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter({} as never, {
    provider: "postgresql",
  }),
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

export default auth;
