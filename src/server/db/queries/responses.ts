import { eq, and, inArray } from "drizzle-orm";
import {
  response,
  assessmentSession,
  questionBankItem,
  questionnaireItem,
  questionnaireVersion,
  subjectProfile,
} from "@/server/db/schema";
import type { db as DbInstance } from "@/server/db";
import { mapResponseValueToData } from "@/server/lib/responses";
import { logger } from "@/lib/logger";

export async function saveResponse(
  db: typeof DbInstance,
  {
    sessionId,
    questionId,
    value,
    selectedOptionId,
    selectedOptionIds,
    userId,
  }: {
    sessionId: string;
    questionId: string;
    value: string | number | boolean | string[];
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    userId: string;
  },
) {
  // Verify session ownership
  const session = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.userId !== userId) {
    throw new Error("Unauthorized - session does not belong to user");
  }

  if (session.status === "completed") {
    throw new Error("Cannot modify responses for completed session");
  }

  // Validate that questionId belongs to this session's questionnaire version
  const questionnaireVersionId = session.questionnaireVersionId;
  if (!questionnaireVersionId) {
    throw new Error("Session missing questionnaire version");
  }
  const item = await db.query.questionnaireItem.findFirst({
    where: and(
      eq(questionnaireItem.questionnaireVersionId, questionnaireVersionId),
      eq(questionnaireItem.questionId, questionId),
    ),
  });

  if (!item) {
    throw new Error("Question does not belong to this session's questionnaire");
  }

  // Get question to determine type
  const question = await db.query.questionBankItem.findFirst({
    where: eq(questionBankItem.id, questionId),
  });

  if (!question) {
    throw new Error("Question not found");
  }

  // Check for existing response
  const existingResponse = await db.query.response.findFirst({
    where: and(
      eq(response.assessmentSessionId, sessionId),
      eq(response.questionId, questionId),
    ),
  });

  const now = new Date();
  const responseData = mapResponseValueToData(
    question.questionTypeCode,
    {
      value,
      selectedOptionId,
      selectedOptionIds,
    },
    {
      assessmentSessionId: sessionId,
      questionId,
      updatedAt: now,
    },
  );

  if (existingResponse) {
    // Update existing response
    await db
      .update(response)
      .set(responseData)
      .where(eq(response.id, existingResponse.id));
  } else {
    // Create new response
    const responseId = crypto.randomUUID();
    await db.insert(response).values({
      id: responseId,
      ...responseData,
      createdAt: now,
    });
  }

  // Update session updatedAt
  await db
    .update(assessmentSession)
    .set({ updatedAt: now })
    .where(eq(assessmentSession.id, sessionId));

  return { success: true };
}

export async function saveResponsesBatch(
  db: typeof DbInstance,
  {
    sessionId,
    responses,
    userId,
  }: {
    sessionId: string;
    responses: {
      questionId: string;
      value: string | number | boolean | string[];
      selectedOptionId?: string;
      selectedOptionIds?: string[];
    }[];
    userId: string;
  },
) {
  // Verify session ownership
  const session = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.userId !== userId) {
    throw new Error("Unauthorized - session does not belong to user");
  }

  if (session.status === "completed") {
    throw new Error("Cannot modify responses for completed session");
  }

  const questionnaireVersionId = session.questionnaireVersionId;
  if (!questionnaireVersionId) {
    throw new Error("Session missing questionnaire version");
  }

  // Get all items for this version to validate questions
  const items = await db.query.questionnaireItem.findMany({
    where: eq(questionnaireItem.questionnaireVersionId, questionnaireVersionId),
  });
  const validQuestionIds = new Set(items.map((i) => i.questionId));

  // Get all questions to determine types
  const questions = await db.query.questionBankItem.findMany({
    where: inArray(
      questionBankItem.id,
      responses.map((r) => r.questionId),
    ),
  });
  const questionsMap = new Map(questions.map((q) => [q.id, q]));

  const now = new Date();
  let savedCount = 0;
  const failed: { questionId: string; error: string }[] = [];

  // Process all responses within a single transaction to ensure atomicity
  return db.transaction(async (tx) => {
    if (responses.length === 0) {
      throw new Error("Cannot save empty responses array");
    }

    for (const resp of responses) {
      try {
        if (!validQuestionIds.has(resp.questionId)) {
          throw new Error(
            "Question does not belong to this session's questionnaire",
          );
        }

        const question = questionsMap.get(resp.questionId);
        if (!question) {
          throw new Error("Question not found");
        }

        const responseData = mapResponseValueToData(
          question.questionTypeCode,
          {
            value: resp.value,
            selectedOptionId: resp.selectedOptionId,
            selectedOptionIds: resp.selectedOptionIds,
          },
          {
            assessmentSessionId: sessionId,
            questionId: resp.questionId,
            updatedAt: now,
          },
        );

        // Check for existing response
        const existingResponse = await tx.query.response.findFirst({
          where: and(
            eq(response.assessmentSessionId, sessionId),
            eq(response.questionId, resp.questionId),
          ),
        });

        if (existingResponse) {
          await tx
            .update(response)
            .set(responseData)
            .where(eq(response.id, existingResponse.id));
        } else {
          const responseId = crypto.randomUUID();
          await tx.insert(response).values({
            id: responseId,
            ...responseData,
            createdAt: now,
          });
        }

        savedCount++;
      } catch (error) {
        failed.push({
          questionId: resp.questionId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update session updatedAt
    await tx
      .update(assessmentSession)
      .set({ updatedAt: now })
      .where(eq(assessmentSession.id, sessionId));

    return {
      success: failed.length === 0,
      savedCount,
      failed: failed.length > 0 ? failed : undefined,
    };
  });
}

export async function getResponsesBySession(
  db: typeof DbInstance,
  sessionId: string,
) {
  return db
    .select()
    .from(response)
    .where(eq(response.assessmentSessionId, sessionId));
}

export async function getAggregatedResponses(
  db: typeof DbInstance,
  questionnaireId: string,
  userId: string,
) {
  // Get active version for this questionnaire
  const activeVersion = await db.query.questionnaireVersion.findFirst({
    where: and(
      eq(questionnaireVersion.questionnaireId, questionnaireId),
      eq(questionnaireVersion.isActive, true),
    ),
  });

  if (!activeVersion) {
    return {
      totalSessions: 0,
      questionnaireId,
      sessions: [],
      responses: [],
    };
  }

  // Get user's own completed sessions for this questionnaire version
  const userSessions = await db
    .select({
      id: assessmentSession.id,
      completedAt: assessmentSession.completedAt,
      updatedAt: assessmentSession.updatedAt,
      subjectProfileId: assessmentSession.subjectProfileId,
      questionnaireVersionId: assessmentSession.questionnaireVersionId,
      status: assessmentSession.status,
    })
    .from(assessmentSession)
    .where(
      and(
        eq(assessmentSession.questionnaireVersionId, activeVersion.id),
        eq(assessmentSession.status, "completed"),
        eq(assessmentSession.userId, userId),
      ),
    );

  const sessionIds = userSessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return {
      totalSessions: 0,
      questionnaireId,
      sessions: [],
      responses: [],
    };
  }

  // Get responses from user's own sessions only
  const userResponses = await db
    .select()
    .from(response)
    .where(inArray(response.assessmentSessionId, sessionIds));

  return {
    totalSessions: userSessions.length,
    questionnaireId,
    sessions: userSessions,
    responses: userResponses,
  };
}

export async function getModelResponses(
  db: typeof DbInstance,
  questionnaireId: string,
) {
  // Get active version and model profiles
  const allModelProfilesResult = await db
    .select()
    .from(subjectProfile)
    .where(eq(subjectProfile.subjectType, "llm"))
    .catch((error) => {
      logger.error("Failed to fetch model profiles:", error);
      return [];
    });

  const allModelProfiles = Array.isArray(allModelProfilesResult)
    ? allModelProfilesResult
    : [];

  const activeVersion = await db.query.questionnaireVersion.findFirst({
    where: and(
      eq(questionnaireVersion.questionnaireId, questionnaireId),
      eq(questionnaireVersion.isActive, true),
    ),
  });

  const modelProfileIds = allModelProfiles.map((p) => p.id);

  if (modelProfileIds.length === 0) {
    return {
      models: [],
      responses: [],
      sessions: [],
    };
  }

  if (!activeVersion) {
    return {
      models: allModelProfiles,
      responses: [],
      sessions: [],
    };
  }

  // Get all completed sessions for this questionnaire version from AI/LLM models
  const modelSessions = await db
    .select({
      id: assessmentSession.id,
      subjectProfileId: assessmentSession.subjectProfileId,
    })
    .from(assessmentSession)
    .where(
      and(
        eq(assessmentSession.questionnaireVersionId, activeVersion.id),
        eq(assessmentSession.status, "completed"),
        inArray(assessmentSession.subjectProfileId, modelProfileIds),
      ),
    );

  const sessionIds = modelSessions.map((s) => s.id);

  if (sessionIds.length === 0) {
    return {
      models: allModelProfiles,
      responses: [],
      sessions: [],
    };
  }

  // Get all responses from model sessions
  const modelResponses = await db
    .select()
    .from(response)
    .where(inArray(response.assessmentSessionId, sessionIds));

  return {
    models: allModelProfiles,
    responses: modelResponses,
    sessions: modelSessions,
  };
}
