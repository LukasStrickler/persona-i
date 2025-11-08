import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { user, session } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function DELETE(request: Request) {
  let userId: string | undefined;
  try {
    // Get the current session
    const sessionData = await auth.api.getSession({
      headers: request.headers,
    });

    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = sessionData.user.id;

    // Parse request body for confirmation
    let body: { confirmed?: boolean };
    try {
      body = (await request.json()) as { confirmed?: boolean };
    } catch {
      return NextResponse.json(
        { error: "Invalid or malformed JSON in request body" },
        { status: 400 },
      );
    }

    // Require confirmation
    if (!body.confirmed || body.confirmed !== true) {
      return NextResponse.json(
        { error: "Account deletion requires confirmation" },
        { status: 403 },
      );
    }

    // Get IP address for audit log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // Explicit guard: ensure userId is defined before proceeding
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TypeScript: userId is guaranteed to be defined after the guard
    const confirmedUserId: string = userId;

    // Audit log before deletion
    logger.warn("Account deletion requested", {
      userId: confirmedUserId,
      timestamp: new Date().toISOString(),
      ip: ipAddress,
    });

    /**
     * Account deletion cleanup:
     * This transaction performs the following cleanup operations:
     * 1. Deletes all user sessions (prevents access after deletion)
     * 2. Deletes the user record (cascades to related tables via foreign keys):
     *    - user accounts (OAuth accounts)
     *    - verification tokens
     *    - any other tables with foreign key references to user.id
     *
     * Note: Additional cleanup may be required for:
     * - User-generated content (posts, comments, etc.)
     * - Uploaded files (avatars, documents, etc.)
     * - Third-party integrations (webhooks, API keys, etc.)
     * - Analytics or tracking data
     *
     * Ensure all user data is properly deleted for GDPR compliance.
     */
    await db.transaction(async (tx) => {
      // Delete all user sessions
      await tx.delete(session).where(eq(session.userId, confirmedUserId));

      // Delete the user from the database
      // This will cascade delete remaining accounts due to foreign key constraints
      await tx.delete(user).where(eq(user.id, confirmedUserId));
    });

    return NextResponse.json(
      { success: true, message: "Account deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error deleting account", {
      userId: userId ?? "unknown",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
