import "server-only";
import { headers } from "next/headers";
import { createTRPCContext } from "./trpc";
import { createCaller } from "./root";

/**
 * Create a tRPC caller for use in Server Components.
 * It automatically passes the Next.js request headers to the tRPC context,
 * allowing for session retrieval in server-side calls.
 *
 * This ensures that protectedProcedure calls will have access to the authenticated user.
 */
export async function getServerTRPC() {
  const h = await headers();
  const ctx = await createTRPCContext({ headers: h });

  // Verify user is available for debugging
  if (process.env.NODE_ENV === "development" && !ctx.user) {
    console.warn(
      "[getServerTRPC] No user found in context - protectedProcedure calls will fail",
    );
  }

  return createCaller(ctx);
}
