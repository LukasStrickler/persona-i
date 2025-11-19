/* eslint-disable no-console */
import { db } from "@/server/db";
import {
  subjectProfile,
  assessmentSession,
  response,
  questionnaire,
  questionnaireVersion,
  questionnaireItem,
  questionBankItem,
  questionOption,
} from "@/server/db/schema";
import { QuestionTypeCode } from "@/lib/types/question-types";
import { eq, and } from "drizzle-orm";

/**
 * Generate random response based on question type
 */
function generateRandomResponse(
  questionType: QuestionTypeCode | string,
  config: unknown,
  options?: Array<{ id: string; value: string }>,
): string | number | boolean {
  switch (questionType) {
    case QuestionTypeCode.SINGLE_CHOICE as string:
      if (options && options.length > 0) {
        const randomOption =
          options[Math.floor(Math.random() * options.length)];
        return randomOption?.value ?? "";
      }
      return "";

    case QuestionTypeCode.SCALAR as string: {
      const scalarConfig = config as {
        min: number;
        max: number;
        step?: number;
      };
      const min = scalarConfig.min ?? 0;
      const max = scalarConfig.max ?? 10;
      const step = scalarConfig.step ?? 1;
      const range = max - min;
      const steps = Math.floor(range / step);
      return min + Math.floor(Math.random() * (steps + 1)) * step;
    }

    case QuestionTypeCode.BOOLEAN as string:
      return Math.random() > 0.5;

    case QuestionTypeCode.TEXT as string:
      return `Generated response ${Math.random().toString(36).substring(7)}`;

    default:
      return "";
  }
}

/**
 * Seed synthetic sessions with human and AI/LLM model responses
 */
export async function seedSyntheticSessions() {
  console.log("🌱 Seeding synthetic sessions...");

  // Get all public questionnaires
  const questionnaires = await db
    .select()
    .from(questionnaire)
    .where(eq(questionnaire.isPublic, true));

  // Create AI/LLM model profiles
  // All are language models, so use consistent "llm" type
  const aiModels = [
    { name: "GPT-4", type: "llm" as const },
    { name: "Claude 3", type: "llm" as const },
    { name: "Gemini Pro", type: "llm" as const },
  ];

  const modelProfiles: Array<{ id: string; name: string; type: string }> = [];

  for (const model of aiModels) {
    const existing = await db.query.subjectProfile.findFirst({
      where: and(
        eq(subjectProfile.displayName, model.name),
        eq(subjectProfile.subjectType, model.type),
      ),
    });

    if (existing) {
      modelProfiles.push({
        id: existing.id,
        name: existing.displayName,
        type: existing.subjectType,
      });
      continue;
    }

    const profileId = crypto.randomUUID();
    await db.insert(subjectProfile).values({
      id: profileId,
      subjectType: model.type,
      userId: null,
      displayName: model.name,
      metadataJson: { model: model.name, version: "latest" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    modelProfiles.push({
      id: profileId,
      name: model.name,
      type: model.type,
    });
  }

  // For each questionnaire, create sessions
  for (const q of questionnaires) {
    const version = await db.query.questionnaireVersion.findFirst({
      where: and(
        eq(questionnaireVersion.questionnaireId, q.id),
        eq(questionnaireVersion.isActive, true),
      ),
    });

    if (!version) {
      continue;
    }

    // Get all questions for this version
    const items = await db
      .select()
      .from(questionnaireItem)
      .where(eq(questionnaireItem.questionnaireVersionId, version.id))
      .orderBy(questionnaireItem.position);

    // Create sessions for AI models
    for (const model of modelProfiles) {
      const sessionId = crypto.randomUUID();
      const now = new Date();

      await db.insert(assessmentSession).values({
        id: sessionId,
        questionnaireVersionId: version.id,
        subjectProfileId: model.id,
        userId: null,
        status: "completed",
        startedAt: now,
        completedAt: now,
        metadataJson: { synthetic: true, model: model.name },
        createdAt: now,
        updatedAt: now,
      });

      // Generate responses for each question
      for (const item of items) {
        const question = await db.query.questionBankItem.findFirst({
          where: eq(questionBankItem.id, item.questionId),
        });

        if (!question) {
          continue;
        }

        // Get options if needed (for single_choice and multi_choice)
        const options =
          question.questionTypeCode ===
            (QuestionTypeCode.SINGLE_CHOICE as string) ||
          question.questionTypeCode ===
            (QuestionTypeCode.MULTI_CHOICE as string)
            ? await db
                .select()
                .from(questionOption)
                .where(eq(questionOption.questionId, question.id))
            : [];

        const responseValue = generateRandomResponse(
          question.questionTypeCode,
          question.configJson,
          options,
        );

        const responseId = crypto.randomUUID();
        const responseData: {
          id: string;
          assessmentSessionId: string;
          questionId: string;
          selectedOptionId?: string | null;
          valueNumeric?: number | null;
          valueBoolean?: boolean | null;
          valueText?: string | null;
          rawPayloadJson?: unknown;
          valueType?: string | null;
          createdAt: Date;
          updatedAt: Date;
        } = {
          id: responseId,
          assessmentSessionId: sessionId,
          questionId: question.id,
          createdAt: now,
          updatedAt: now,
        };

        if (
          question.questionTypeCode ===
          (QuestionTypeCode.SINGLE_CHOICE as string)
        ) {
          const option = options.find((o) => o.value === responseValue);
          responseData.selectedOptionId = option?.id ?? null;
          responseData.valueText = String(responseValue);
          responseData.valueType = "option";
        } else if (
          question.questionTypeCode === (QuestionTypeCode.SCALAR as string)
        ) {
          responseData.valueNumeric = responseValue as number;
          responseData.valueType = "numeric";
        } else if (
          question.questionTypeCode === (QuestionTypeCode.BOOLEAN as string)
        ) {
          responseData.valueBoolean = responseValue as boolean;
          responseData.valueType = "boolean";
        } else if (
          question.questionTypeCode === (QuestionTypeCode.TEXT as string)
        ) {
          responseData.valueText = String(responseValue);
          responseData.valueType = "text";
        } else if (
          question.questionTypeCode ===
          (QuestionTypeCode.MULTI_CHOICE as string)
        ) {
          // For multi-choice, generate random selections
          const multiOptions = await db
            .select()
            .from(questionOption)
            .where(eq(questionOption.questionId, question.id));

          if (multiOptions.length > 0) {
            const numSelections = Math.floor(
              Math.random() * Math.min(multiOptions.length, 3) + 1,
            );
            const selectedOptions = multiOptions
              .sort(() => Math.random() - 0.5)
              .slice(0, numSelections);
            const selectedValues = selectedOptions.map((o) => o.value);
            responseData.rawPayloadJson = selectedValues;
            responseData.valueType = "multi_choice";
          }
        }

        await db.insert(response).values(responseData);
      }

      console.log(`  ✅ Created session for ${model.name} on ${q.title}`);
    }
  }

  console.log("✅ Synthetic sessions seeding complete!");
}
