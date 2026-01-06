import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  closeTestDatabase,
  type TestDatabase,
} from "@/test-utils/db";
import { questionnairesRouter } from "../questionnaires";
import type { createTRPCContext } from "@/server/api/trpc";
import {
  questionnaire,
  questionnaireVersion,
  userQuestionnaireAccess,
  assessmentSession,
  user,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";

describe("Questionnaires Router", () => {
  let db: TestDatabase;
  const userId = "user-1";
  let caller: ReturnType<typeof questionnairesRouter.createCaller>;

  beforeEach(async () => {
    // Create a fresh database for each test (matches isolated test pattern)
    db = await createTestDatabase();

    // Create user (required for foreign keys)
    await db.insert(user).values({
      id: userId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock context - cast through unknown for test flexibility
    const ctx = {
      db,
      session: {
        user: {
          id: userId,
          name: "Test User",
          email: "test@example.com",
        },
      },
      user: {
        id: userId,
        name: "Test User",
        email: "test@example.com",
      },
    } as unknown as Awaited<ReturnType<typeof createTRPCContext>>;
    caller = questionnairesRouter.createCaller(ctx);
  });

  afterEach(async () => {
    await closeTestDatabase(db);
  });

  it("should get public questionnaires", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "router-public",
      title: "Router Public",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    const result = await caller.getPublic();
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(qId);
  });

  it("should start session by slug", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "router-session",
      title: "Router Session",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    const result = await caller.startSessionBySlug({
      questionnaireSlug: "router-session",
    });

    expect(result.sessionId).toBeDefined();
    expect(result.slug).toBe("router-session");

    // Verify session created in DB
    const session = await db.query.assessmentSession.findFirst({
      where: eq(assessmentSession.id, result.sessionId),
    });
    expect(session).toBeDefined();
    expect(session?.userId).toBe(userId);
  });

  it("should fail to start session for private questionnaire without access", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "router-private",
      title: "Router Private",
      isPublic: false,
      status: "active",
      createdAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    await expect(
      caller.startSessionBySlug({ questionnaireSlug: "router-private" }),
    ).rejects.toThrow("You do not have access");
  });

  it("should start session for private questionnaire with access", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "router-private-access",
      title: "Router Private Access",
      isPublic: false,
      status: "active",
      createdAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    await db.insert(userQuestionnaireAccess).values({
      id: crypto.randomUUID(),
      userId,
      questionnaireId: qId,
      createdAt: new Date(),
    });

    const result = await caller.startSessionBySlug({
      questionnaireSlug: "router-private-access",
    });

    expect(result.sessionId).toBeDefined();
  });
});
