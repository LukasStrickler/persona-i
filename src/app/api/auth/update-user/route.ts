import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(
      /^[\p{L}\p{M}0-9\s'-]+$/u,
      "Name can only contain letters, numbers, spaces, hyphens, and apostrophes",
    ),
});

export async function PATCH(request: Request) {
  let userId: string | undefined;
  try {
    // Get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;

    // Parse and validate the request body
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 },
        );
      }
      throw error; // Re-throw non-JSON parsing errors
    }

    const validatedData = updateNameSchema.parse(body);

    // Update the user's name in the database
    // Note: Drizzle's update doesn't return affected rows directly
    // We'll check by querying the user after update to verify it exists
    await db
      .update(user)
      .set({
        name: validatedData.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    // Verify the user still exists (wasn't deleted concurrently)
    const updatedUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!updatedUser) {
      logger.warn("User update failed: user not found after update", {
        userId,
      });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Name updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    logger.error("Error updating user name", {
      userId: userId ?? "unknown",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
