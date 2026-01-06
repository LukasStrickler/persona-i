import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createTestDatabase,
  closeTestDatabase,
  type TestDatabase,
} from "@/test-utils/db";
import {
  questionnaire,
  questionnaireVersion,
  assessmentSession,
  subjectProfile,
  user,
} from "@/server/db/schema";
import {
  createAssessmentSession,
  getAssessmentSession,
  getOrCreateSubjectProfile,
} from "../sessions";

describe("Session Queries", () => {
  let db: TestDatabase;

  beforeEach(async () => {
    // Create a fresh database for each test (matches isolated test pattern)
    db = await createTestDatabase();

    // Create user (required for subjectProfile foreign key)
    await db.insert(user).values({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await closeTestDatabase(db);
  });

  it("should get or create subject profile", async () => {
    const userId = "user-1";
    const profile1 = await getOrCreateSubjectProfile(
      db,
      userId,
      "User 1",
      "user1@example.com",
    );

    expect(profile1).toBeDefined();
    expect(profile1.userId).toBe(userId);

    // Should return existing profile on second call
    const profile2 = await getOrCreateSubjectProfile(
      db,
      userId,
      "User 1",
      "user1@example.com",
    );

    expect(profile2.id).toBe(profile1.id);
  });

  it("should create assessment session", async () => {
    // Seed questionnaire
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";
    const profileId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "session-test",
      title: "Session Test",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    await db.insert(subjectProfile).values({
      id: profileId,
      subjectType: "human",
      userId,
      displayName: "User 1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const session = await createAssessmentSession(db, {
      questionnaireVersionId: vId,
      subjectProfileId: profileId,
      userId,
    });

    expect(session).toBeDefined();
    expect(session.questionnaireVersionId).toBe(vId);
    expect(session.status).toBe("in_progress");

    // Should return existing session if in progress
    const session2 = await createAssessmentSession(db, {
      questionnaireVersionId: vId,
      subjectProfileId: profileId,
      userId,
    });

    expect(session2.id).toBe(session.id);
  });

  it("should get assessment session with details", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";
    const profileId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "get-session-test",
      title: "Get Session Test",
      isPublic: true,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireVersion).values({
      id: vId,
      questionnaireId: qId,
      version: 1,
      isActive: true,
      createdAt: new Date(),
    });

    await db.insert(subjectProfile).values({
      id: profileId,
      subjectType: "human",
      userId,
      displayName: "User 1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(assessmentSession).values({
      id: sessionId,
      questionnaireVersionId: vId,
      subjectProfileId: profileId,
      userId,
      status: "in_progress",
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getAssessmentSession(db, sessionId, userId);
    expect(result).not.toBeNull();
    expect(result?.session.id).toBe(sessionId);
    expect(result?.questionnaire.id).toBe(qId);
    expect(result?.version.id).toBe(vId);
  });
});
