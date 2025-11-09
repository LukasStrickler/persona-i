import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { env } from "@/env";
import { MagicLinkEmail } from "@/emails/magic-link";
import { hashToken } from "@/lib/token-hash";
import { logger } from "@/lib/logger";
import { randomInt } from "crypto";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Generate a 6-character alphanumeric verification token.
 * Matches the old NextAuth implementation format.
 */
export function generateVerificationToken(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += characters.charAt(randomInt(0, characters.length));
  }
  return token;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    // Add social providers here if needed
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  trustedOrigins: [
    env.BETTER_AUTH_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  ],
  plugins: [
    magicLink({
      generateToken: () => generateVerificationToken(),
      storeToken: {
        type: "custom-hasher",
        hash: async (token: string) => hashToken(token),
      },
      async sendMagicLink({ email, url, token: _token }) {
        try {
          await resend.emails.send({
            from: env.RESEND_FROM,
            to: email,
            subject: "Sign in to your account",
            react: MagicLinkEmail({ verifyUrl: url, email }),
          });
        } catch (error) {
          logger.error("Error sending magic link email", {
            email,
            error: error instanceof Error ? error.message : String(error),
          });

          // Invalidate or remove the token from the verification store
          // Note: BetterAuth handles token cleanup on expiry, but we should
          // still log the failure for monitoring
          throw error;
        }
      },
      expiresIn: 1800, // 30 minutes
      disableSignUp: false,
    }),
    nextCookies(), // MUST be last plugin for App Router cookie handling
  ],
});
