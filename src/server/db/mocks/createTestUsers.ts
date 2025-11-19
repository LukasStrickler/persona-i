import { dev_db } from "scripts/setup-db";
import { user, verification } from "../schema";
import { logger } from "@/lib/logger";
import * as crypto from "crypto";
import { hashToken, generateVerificationToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function createTestUsers() {
  // Prevent running in production
  if (process.env.NODE_ENV === "production") {
    logger.error("createTestUsers cannot be run in production");
    throw new Error("createTestUsers cannot be run in production");
  }

  if (!dev_db) {
    throw new Error(
      "dev_db is not initialized. Call main() in setup-db.ts first.",
    );
  }

  logger.dev("\n👤 Adding test users...");

  const testUsers = [
    {
      name: "Test User 1",
      email: "test.user1@example.com",
    },
    {
      name: "Test User 2",
      email: "test.user2@example.com",
    },
    {
      name: "", // Nameless user for testing name collection prompt
      email: "nameless.user@example.com",
    },
  ];

  const baseUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";

  for (const userData of testUsers) {
    try {
      // Check for existing user by email using select instead of query builder
      const existingUsers = await dev_db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUsers.length > 0) {
        logger.dev(
          `⚠️  User with email ${userData.email} already exists, skipping...`,
        );
        continue;
      }

      const userId = crypto.randomUUID();
      const now = new Date();

      // Generate token before transaction for logging after commit
      const plainToken = generateVerificationToken();
      const hashedToken = hashToken(plainToken);
      const verificationId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Wrap user and verification inserts in a transaction
      await dev_db.transaction(async (tx) => {
        await tx.insert(user).values({
          id: userId,
          name: userData.name || "", // Use empty string if name is not provided (for testing name collection)
          email: userData.email,
          emailVerified: true, // Set to true for test users
          image: null,
          createdAt: now,
          updatedAt: now,
        });

        // Insert verification token into BetterAuth verification table
        // BetterAuth stores: identifier = hashed token, value = JSON.stringify({email, name})
        await tx.insert(verification).values({
          id: verificationId,
          identifier: hashedToken, // Store the hashed token in identifier field
          value: JSON.stringify({
            email: userData.email,
            name: userData.name,
          }), // Store JSON with email/name in value field
          expiresAt,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Log after successful transaction
      const callbackURL = "/"; // Default to homepage
      const magicLinkUrl = `${baseUrl}/api/auth/magic-link/verify?token=${plainToken}&callbackURL=${encodeURIComponent(callbackURL)}`;

      logger.dev(
        `\n✅ ${userData.name || "(Nameless - for testing)"} account created successfully`,
      );
      logger.dev(`   📧 Email: ${userData.email}`);
      logger.dev(`   🔑 Magic Link URL:`);
      logger.dev(`      ${magicLinkUrl}`);
      logger.dev(`   🔐 Plain Token (for testing): ${plainToken}`);
    } catch (error) {
      logger.error(
        `Error creating test user ${userData.email}:`,
        error instanceof Error ? error.message : String(error),
      );
      // Continue with next user instead of failing entire operation
    }
  }

  logger.dev(
    "\n📝 These magic links are ready to use and will expire in 24 hours",
  );
}
