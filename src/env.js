import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Helper function to create a Zod schema for URL validation.
 * Replaces the deprecated .url() method in Zod v4.
 * Supports http://, https://, libsql://, file:, and other database URL formats.
 */
const urlSchema = () =>
  z.string().refine(
    (value) => {
      try {
        // Use URL parser for robust validation
        // This handles case-insensitive schemes and validates URL structure
        const url = new URL(value);
        // Allow known database/file schemes that may not be standard
        const allowedSchemes = [
          "http",
          "https",
          "libsql",
          "file",
          "sqlite",
          "postgres",
          "postgresql",
          "mysql",
        ];
        const scheme = url.protocol.replace(":", "").toLowerCase();
        return allowedSchemes.includes(scheme) || value.startsWith("file:");
      } catch {
        // If URL parsing fails, check if it's a file: path (which may not have //)
        return value.match(/^[a-z][a-z0-9+.-]*:(\/\/)?.+/i) !== null;
      }
    },
    {
      message:
        "Invalid URL format. Must be a valid URL with a protocol (e.g., http://, https://, libsql://, file:)",
    },
  );

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: urlSchema(),
    DATABASE_TOKEN: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: urlSchema().optional(),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z
      .string()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
    HCAPTCHA_SECRET_KEY: z.string().min(1).optional(),
    CONTACT_EMAIL: z
      .string()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: urlSchema().optional(),
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: z.string().min(1).optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_TOKEN: process.env.DATABASE_TOKEN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    HCAPTCHA_SECRET_KEY: process.env.HCAPTCHA_SECRET_KEY,
    CONTACT_EMAIL: process.env.CONTACT_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
