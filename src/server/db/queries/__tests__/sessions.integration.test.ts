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
  questionBankItem,
  questionnaireItem,
  questionOption,
  questionType,
  response,
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

  it("should get assessment session with multiple questions using batch queries", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";
    const profileId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    // Create questionnaire and version
    await db.insert(questionnaire).values({
      id: qId,
      slug: "batch-query-test",
      title: "Batch Query Test",
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

    // Create question types
    await db
      .insert(questionType)
      .values([
        {
          id: crypto.randomUUID(),
          code: "single_choice",
          name: "Single Choice",
          componentName: "SingleChoiceQuestion",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: crypto.randomUUID(),
          code: "text",
          name: "Text",
          componentName: "TextQuestion",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing();

    // Create multiple questions (10 questions to test batch behavior)
    const questionIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const questionId = crypto.randomUUID();
      questionIds.push(questionId);

      await db.insert(questionBankItem).values({
        id: questionId,
        code: `q${i + 1}`,
        prompt: `Question ${i + 1}`,
        questionTypeCode: i % 2 === 0 ? "single_choice" : "text",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(questionnaireItem).values({
        id: crypto.randomUUID(),
        questionnaireVersionId: vId,
        questionId: questionId,
        position: i + 1,
        section: i < 5 ? "Section A" : "Section B",
        isRequired: true,
        createdAt: new Date(),
      });

      // Add options for single_choice questions
      if (i % 2 === 0) {
        for (let j = 0; j < 3; j++) {
          await db.insert(questionOption).values({
            id: crypto.randomUUID(),
            questionId: questionId,
            value: `option${j + 1}`,
            label: `Option ${j + 1}`,
            position: j + 1,
            createdAt: new Date(),
          });
        }
      }
    }

    // Add some responses
    await db.insert(response).values({
      id: crypto.randomUUID(),
      assessmentSessionId: sessionId,
      questionId: questionIds[0]!,
      valueType: "text",
      valueText: "Answer 1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(response).values({
      id: crypto.randomUUID(),
      assessmentSessionId: sessionId,
      questionId: questionIds[2]!,
      valueType: "text",
      valueText: "Answer 3",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Execute and verify
    const result = await getAssessmentSession(db, sessionId, userId);

    expect(result).not.toBeNull();
    expect(result?.session.id).toBe(sessionId);
    expect(result?.questionnaire.id).toBe(qId);
    expect(result?.version.id).toBe(vId);

    // Verify all 10 items are returned
    expect(result?.items).toHaveLength(10);

    // Verify sections are grouped correctly
    expect(result?.sections).toHaveLength(2);
    expect(result?.sections[0]?.name).toBe("Section A");
    expect(result?.sections[0]?.items).toHaveLength(5);
    expect(result?.sections[1]?.name).toBe("Section B");
    expect(result?.sections[1]?.items).toHaveLength(5);

    // Verify options are loaded for choice questions
    const choiceQuestion = result?.items.find(
      (item) => item.question.questionTypeCode === "single_choice",
    );
    expect(choiceQuestion?.question.options).toHaveLength(3);

    // Verify text questions have no options
    const textQuestion = result?.items.find(
      (item) => item.question.questionTypeCode === "text",
    );
    expect(textQuestion?.question.options).toHaveLength(0);

    // Verify responses are attached
    const itemWithResponse = result?.items.find(
      (item) => item.question.id === questionIds[0],
    );
    expect(itemWithResponse?.response).not.toBeNull();
    expect(itemWithResponse?.response?.valueText).toBe("Answer 1");

    const itemWithoutResponse = result?.items.find(
      (item) => item.question.id === questionIds[1],
    );
    expect(itemWithoutResponse?.response).toBeNull();
  });
});
