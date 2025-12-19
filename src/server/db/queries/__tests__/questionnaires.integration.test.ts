import { describe, expect, it, beforeEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test-utils/db";
import {
  questionnaire,
  questionnaireVersion,
  questionBankItem,
  questionnaireItem,
  questionOption,
  userQuestionnaireAccess,
  questionType,
  user,
} from "@/server/db/schema";
import {
  getPublicQuestionnaires,
  getQuestionnaireBySlug,
  getQuestionnaireMetadata,
  getUserQuestionnaireAccess,
  getQuestionnaireById,
} from "../questionnaires";

describe("Questionnaire Queries", () => {
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
  });

  it("should get public questionnaires with active versions", async () => {
    // Seed data
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "public-test",
      title: "Public Test",
      description: "Description",
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

    const result = await getPublicQuestionnaires(db);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(qId);
    expect(result[0]?.activeVersion?.id).toBe(vId);
  });

  it("should get questionnaire by slug with items and questions", async () => {
    // Seed data
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const qItemId = crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const optionId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "slug-test",
      title: "Slug Test",
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

    await db.insert(questionBankItem).values({
      id: questionId,
      code: "q1",
      prompt: "Question 1",
      questionTypeCode: "single_choice",
      createdAt: new Date(),
    });

    await db.insert(questionnaireItem).values({
      id: qItemId,
      questionnaireVersionId: vId,
      questionId: questionId,
      position: 1,
      isRequired: true,
      createdAt: new Date(),
    });

    await db.insert(questionOption).values({
      id: optionId,
      questionId: questionId,
      value: "opt1",
      label: "Option 1",
      position: 1,
      createdAt: new Date(),
    });

    const result = await getQuestionnaireBySlug(db, "slug-test");
    expect(result).not.toBeNull();
    expect(result?.id).toBe(qId);
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]?.question.id).toBe(questionId);
    expect(result?.items[0]?.question.options).toHaveLength(1);
    expect(result?.items[0]?.question.options[0]?.id).toBe(optionId);
  });

  it("should get questionnaire metadata by slug", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "meta-test",
      title: "Meta Test",
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

    const result = await getQuestionnaireMetadata(db, "meta-test");
    expect(result).not.toBeNull();
    expect(result?.id).toBe(qId);
    expect(result?.version.id).toBe(vId);
    // Should not have items property (it's metadata only)
    expect((result as any).items).toBeUndefined();
  });

  it("should get user accessible private questionnaires", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();
    const userId = "user-1";

    // Create user first (required for foreign key)
    await db.insert(user).values({
      id: userId,
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(questionnaire).values({
      id: qId,
      slug: "private-test",
      title: "Private Test",
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

    const result = await getUserQuestionnaireAccess(db, userId);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(qId);
  });

  it("should get questionnaire by id", async () => {
    const qId = crypto.randomUUID();
    const vId = crypto.randomUUID();

    await db.insert(questionnaire).values({
      id: qId,
      slug: "id-test",
      title: "ID Test",
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

    const result = await getQuestionnaireById(db, qId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(qId);
    expect(result?.activeVersion?.id).toBe(vId);
  });
});
