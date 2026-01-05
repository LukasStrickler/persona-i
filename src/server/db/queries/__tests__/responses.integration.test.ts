import { describe, expect, it, beforeEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test-utils/db";
import {
  questionnaire,
  questionnaireVersion,
  assessmentSession,
  subjectProfile,
  questionBankItem,
  questionnaireItem,
  questionType,
  user,
} from "@/server/db/schema";
import {
  saveResponse,
  saveResponsesBatch,
  getResponsesBySession,
} from "../responses";

describe("Response Queries", () => {
  let db: TestDatabase;

  beforeEach(async () => {
    // Create a fresh database for each test (matches Eilbote-Website pattern)
    db = await createTestDatabase();

    // Seed required question types
    await db
      .insert(questionType)
      .values([
        {
          id: crypto.randomUUID(),
          code: "text",
          name: "Text",
          componentName: "TextQuestion",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          code: "scalar",
          name: "Scalar",
          componentName: "ScalarQuestion",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing();

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

  it("should save a single response", async () => {
    // Seed data
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";
    const profileId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const qItemId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "response-test",
      title: "Response Test",
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

    await db.insert(questionBankItem).values({
      id: questionId,
      code: "q1",
      prompt: "Question 1",
      questionTypeCode: "text",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaireItem).values({
      id: qItemId,
      questionnaireVersionId: vId,
      questionId: questionId,
      position: 1,
      isRequired: true,
      createdAt: new Date(),
    });

    const result = await saveResponse(db, {
      sessionId,
      questionId,
      value: "Test Answer",
      userId,
    });

    expect(result.success).toBe(true);

    const responses = await getResponsesBySession(db, sessionId);
    expect(responses).toHaveLength(1);
    expect(responses[0]?.valueText).toBe("Test Answer");
  });

  it("should save batch responses", async () => {
    // Seed data
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";
    const profileId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const questionId1 = crypto.randomUUID();
    const questionId2 = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "batch-test",
      title: "Batch Test",
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

    await db.insert(questionBankItem).values([
      {
        id: questionId1,
        code: "q1",
        prompt: "Question 1",
        questionTypeCode: "text",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: questionId2,
        code: "q2",
        prompt: "Question 2",
        questionTypeCode: "scalar",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await db.insert(questionnaireItem).values([
      {
        id: crypto.randomUUID(),
        questionnaireVersionId: vId,
        questionId: questionId1,
        position: 1,
        isRequired: true,
        createdAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        questionnaireVersionId: vId,
        questionId: questionId2,
        position: 2,
        isRequired: true,
        createdAt: new Date(),
      },
    ]);

    const result = await saveResponsesBatch(db, {
      sessionId,
      responses: [
        { questionId: questionId1, value: "Answer 1" },
        { questionId: questionId2, value: 5 },
      ],
      userId,
    });

    expect(result.success).toBe(true);
    expect(result.savedCount).toBe(2);

    const responses = await getResponsesBySession(db, sessionId);
    expect(responses).toHaveLength(2);
  });
});
