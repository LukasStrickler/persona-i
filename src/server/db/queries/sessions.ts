import { eq, and, desc } from "drizzle-orm";
import {
  assessmentSession,
  subjectProfile,
  questionnaire,
  questionnaireVersion,
  questionnaireItem,
  questionBankItem,
  questionOption,
  response,
} from "@/server/db/schema";
import type { db as DbInstance } from "@/server/db";

export async function getOrCreateSubjectProfile(
  db: typeof DbInstance,
  userId: string,
  userName: string | null,
  userEmail: string,
) {
  let subjectProfileRecord = await db.query.subjectProfile.findFirst({
    where: and(
      eq(subjectProfile.userId, userId),
      eq(subjectProfile.subjectType, "human"),
    ),
  });

  if (!subjectProfileRecord) {
    // Create new subject profile
    const subjectProfileId = crypto.randomUUID();
    const now = new Date();

    await db.insert(subjectProfile).values({
      id: subjectProfileId,
      subjectType: "human",
      userId,
      displayName: userName ?? userEmail,
      createdAt: now,
      updatedAt: now,
    });

    subjectProfileRecord = {
      id: subjectProfileId,
      subjectType: "human",
      userId,
      displayName: userName ?? userEmail,
      preferredLocale: null,
      metadataJson: null,
      consentFlagsJson: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  return subjectProfileRecord;
}

export async function createAssessmentSession(
  db: typeof DbInstance,
  {
    questionnaireVersionId,
    subjectProfileId,
    userId,
  }: {
    questionnaireVersionId: string;
    subjectProfileId: string;
    userId: string;
  },
) {
  // Check for existing incomplete session
  const existingSession = await db.query.assessmentSession.findFirst({
    where: and(
      eq(assessmentSession.questionnaireVersionId, questionnaireVersionId),
      eq(assessmentSession.subjectProfileId, subjectProfileId),
      eq(assessmentSession.status, "in_progress"),
    ),
    orderBy: [desc(assessmentSession.createdAt)],
  });

  if (existingSession) {
    return existingSession;
  }

  // Create new session
  const sessionId = crypto.randomUUID();
  const now = new Date();

  await db.insert(assessmentSession).values({
    id: sessionId,
    questionnaireVersionId,
    subjectProfileId,
    userId,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    metadataJson: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: sessionId,
    questionnaireVersionId,
    subjectProfileId,
    userId,
    status: "in_progress",
    startedAt: now,
    completedAt: null,
    metadataJson: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAssessmentSession(
  db: typeof DbInstance,
  sessionId: string,
  userId: string,
) {
  const session = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  if (!session) {
    return null;
  }

  // Verify ownership
  if (session.userId !== userId) {
    throw new Error("Unauthorized - session does not belong to user");
  }

  // Get questionnaire version
  const version = await db.query.questionnaireVersion.findFirst({
    where: eq(questionnaireVersion.id, session.questionnaireVersionId),
  });

  if (!version) {
    throw new Error("Questionnaire version not found");
  }

  // Get questionnaire
  const q = await db.query.questionnaire.findFirst({
    where: eq(questionnaire.id, version.questionnaireId),
  });

  if (!q) {
    throw new Error("Questionnaire not found");
  }

  // Get questionnaire items
  const items = await db
    .select()
    .from(questionnaireItem)
    .where(eq(questionnaireItem.questionnaireVersionId, version.id))
    .orderBy(questionnaireItem.position);

  // Get questions and existing responses
  const itemsWithQuestions = await Promise.all(
    items.map(async (item) => {
      const question = await db.query.questionBankItem.findFirst({
        where: eq(questionBankItem.id, item.questionId),
      });

      if (!question) {
        return null;
      }

      // Get options if this is a choice question
      const options =
        question.questionTypeCode === "single_choice" ||
        question.questionTypeCode === "multi_choice"
          ? await db
              .select()
              .from(questionOption)
              .where(eq(questionOption.questionId, question.id))
              .orderBy(questionOption.position)
          : [];

      // Get existing response
      const existingResponse = await db.query.response.findFirst({
        where: and(
          eq(response.assessmentSessionId, session.id),
          eq(response.questionId, question.id),
        ),
      });

      return {
        ...item,
        question: {
          ...question,
          options,
        },
        response: existingResponse ?? null,
      };
    }),
  );

  const validItems = itemsWithQuestions.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );

  // Group items by section
  const itemsBySection = new Map<string, typeof validItems>();
  for (const item of validItems) {
    const sectionName = item.section ?? "Uncategorized";
    if (!itemsBySection.has(sectionName)) {
      itemsBySection.set(sectionName, []);
    }
    itemsBySection.get(sectionName)?.push(item);
  }

  // Convert to sections array, ordered by minimum position in each section
  const sections = Array.from(itemsBySection.entries())
    .map(([name, sectionItems]) => ({
      name,
      items: sectionItems.sort((a, b) => a.position - b.position),
      minPosition: Math.min(...sectionItems.map((item) => item.position)),
    }))
    .sort((a, b) => a.minPosition - b.minPosition)
    .map(({ name, items }) => ({ name, items }));

  return {
    session,
    questionnaire: q,
    version,
    items: validItems, // Keep for backward compatibility
    sections, // New grouped structure
  };
}

/**
 * Complete an assessment session
 * Marks the session as completed and sets the completedAt timestamp
 */
export async function completeAssessmentSession(
  db: typeof DbInstance,
  sessionId: string,
  userId: string,
) {
  // Verify session exists and ownership
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
    // Already completed, return existing session
    return session;
  }

  // Update session to completed
  const now = new Date();
  await db
    .update(assessmentSession)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentSession.id, sessionId));

  // Return updated session
  const updatedSession = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  if (!updatedSession) {
    throw new Error("Failed to retrieve updated session");
  }

  return updatedSession;
}

/**
 * Get incomplete sessions for a user and questionnaire
 * Returns sessions with status "in_progress" for the given user and questionnaire
 */
export async function getIncompleteSessions(
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
    return [];
  }

  // Get user's incomplete sessions for this questionnaire version
  const sessions = await db
    .select({
      id: assessmentSession.id,
      status: assessmentSession.status,
      startedAt: assessmentSession.startedAt,
      updatedAt: assessmentSession.updatedAt,
    })
    .from(assessmentSession)
    .where(
      and(
        eq(assessmentSession.questionnaireVersionId, activeVersion.id),
        eq(assessmentSession.status, "in_progress"),
        eq(assessmentSession.userId, userId),
      ),
    )
    .orderBy(desc(assessmentSession.updatedAt));

  return sessions;
}

/**
 * Get user session IDs for a questionnaire
 * Returns lightweight session data (just IDs) for completed sessions
 * Used for syncing client-side state with server
 */
export async function getUserSessionIds(
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
    return { sessions: [] };
  }

  // Get user's completed sessions for this questionnaire version
  const sessions = await db
    .select({
      id: assessmentSession.id,
    })
    .from(assessmentSession)
    .where(
      and(
        eq(assessmentSession.questionnaireVersionId, activeVersion.id),
        eq(assessmentSession.status, "completed"),
        eq(assessmentSession.userId, userId),
      ),
    )
    .orderBy(desc(assessmentSession.completedAt));

  return { sessions };
}
