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
import type { db as DbType } from "@/server/db";

export async function getOrCreateSubjectProfile(
  db: typeof DbType,
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

    subjectProfileRecord = await db.query.subjectProfile.findFirst({
      where: eq(subjectProfile.id, subjectProfileId),
    });

    subjectProfileRecord ??= {
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
  db: typeof DbType,
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

  const newSession = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  return newSession!;
}

export async function getAssessmentSession(
  db: typeof DbType,
  sessionId: string,
  userId: string,
) {
  const session = await db.query.assessmentSession.findFirst({
    where: eq(assessmentSession.id, sessionId),
  });

  if (!session) {
    return null;
  }

  if (session.userId !== userId) {
    throw new Error("Unauthorized - session does not belong to user");
  }

  const version = await db.query.questionnaireVersion.findFirst({
    where: eq(questionnaireVersion.id, session.questionnaireVersionId),
  });

  if (!version) {
    throw new Error("Questionnaire version not found");
  }

  const q = await db.query.questionnaire.findFirst({
    where: eq(questionnaire.id, version.questionnaireId),
  });

  if (!q) {
    throw new Error("Questionnaire not found");
  }

  const items = await db
    .select()
    .from(questionnaireItem)
    .where(eq(questionnaireItem.questionnaireVersionId, version.id))
    .orderBy(questionnaireItem.position);

  const itemsWithQuestions = await Promise.all(
    items.map(async (item) => {
      const question = await db.query.questionBankItem.findFirst({
        where: eq(questionBankItem.id, item.questionId),
      });

      if (!question) {
        return null;
      }

      const options =
        question.questionTypeCode === "single_choice" ||
        question.questionTypeCode === "multi_choice"
          ? await db
              .select()
              .from(questionOption)
              .where(eq(questionOption.questionId, question.id))
              .orderBy(questionOption.position)
          : [];

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

  const itemsBySection = new Map<string, typeof validItems>();
  for (const item of validItems) {
    const sectionName = item.section ?? "Uncategorized";
    if (!itemsBySection.has(sectionName)) {
      itemsBySection.set(sectionName, []);
    }
    itemsBySection.get(sectionName)?.push(item);
  }

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
    items: validItems,
    sections,
  };
}

export async function completeSession(
  db: typeof DbType,
  sessionId: string,
  userId: string,
) {
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
    return { success: true, message: "Session already completed" };
  }

  const now = new Date();

  await db
    .update(assessmentSession)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentSession.id, sessionId));

  return { success: true };
}

export async function getIncompleteSessions(
  db: typeof DbType,
  questionnaireId: string,
  userId: string,
) {
  const activeVersion = await db.query.questionnaireVersion.findFirst({
    where: and(
      eq(questionnaireVersion.questionnaireId, questionnaireId),
      eq(questionnaireVersion.isActive, true),
    ),
  });

  if (!activeVersion) {
    return [];
  }

  const userProfile = await db.query.subjectProfile.findFirst({
    where: and(
      eq(subjectProfile.userId, userId),
      eq(subjectProfile.subjectType, "human"),
    ),
  });

  if (!userProfile) {
    return [];
  }

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
        eq(assessmentSession.subjectProfileId, userProfile.id),
        eq(assessmentSession.userId, userId),
        eq(assessmentSession.status, "in_progress"),
      ),
    )
    .orderBy(desc(assessmentSession.updatedAt));

  return sessions;
}

export async function getUserSessionIds(
  db: typeof DbType,
  questionnaireId: string,
  userId: string,
) {
  const activeVersion = await db.query.questionnaireVersion.findFirst({
    where: and(
      eq(questionnaireVersion.questionnaireId, questionnaireId),
      eq(questionnaireVersion.isActive, true),
    ),
  });

  if (!activeVersion) {
    return { sessions: [] };
  }

  const userProfile = await db.query.subjectProfile.findFirst({
    where: and(
      eq(subjectProfile.userId, userId),
      eq(subjectProfile.subjectType, "human"),
    ),
  });

  if (!userProfile) {
    return { sessions: [] };
  }

  const sessions = await db
    .select({
      id: assessmentSession.id,
      status: assessmentSession.status,
      completedAt: assessmentSession.completedAt,
      updatedAt: assessmentSession.updatedAt,
    })
    .from(assessmentSession)
    .where(
      and(
        eq(assessmentSession.questionnaireVersionId, activeVersion.id),
        eq(assessmentSession.subjectProfileId, userProfile.id),
        eq(assessmentSession.userId, userId),
      ),
    )
    .orderBy(desc(assessmentSession.updatedAt));

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      completedAt: s.completedAt,
      updatedAt: s.updatedAt,
    })),
  };
}
