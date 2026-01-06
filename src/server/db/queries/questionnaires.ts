import { eq, and, desc, inArray } from "drizzle-orm";
import {
  questionnaire,
  questionnaireVersion,
  questionBankItem,
  questionOption,
  questionnaireItem,
  userQuestionnaireAccess,
} from "@/server/db/schema";
import type { db as DbInstance } from "@/server/db";

export async function getPublicQuestionnaires(db: typeof DbInstance) {
  const publicQuestionnaires = await db.query.questionnaire.findMany({
    where: eq(questionnaire.isPublic, true),
    orderBy: [desc(questionnaire.createdAt)],
  });

  const questionnaireIds = publicQuestionnaires.map((q) => q.id);

  const activeVersions =
    questionnaireIds.length > 0
      ? await db
          .select()
          .from(questionnaireVersion)
          .where(
            and(
              inArray(questionnaireVersion.questionnaireId, questionnaireIds),
              eq(questionnaireVersion.isActive, true),
            ),
          )
          .orderBy(desc(questionnaireVersion.version))
      : [];

  const versionsByQuestionnaireId = new Map<
    string,
    (typeof activeVersions)[number]
  >();
  for (const version of activeVersions) {
    if (!versionsByQuestionnaireId.has(version.questionnaireId)) {
      versionsByQuestionnaireId.set(version.questionnaireId, version);
    }
  }

  return publicQuestionnaires.map((q) => ({
    ...q,
    activeVersion: versionsByQuestionnaireId.get(q.id),
  }));
}

/**
 * Get questionnaire by slug (public only - for public endpoints)
 */
export async function getQuestionnaireBySlug(
  db: typeof DbInstance,
  slug: string,
) {
  return getQuestionnaireBySlugInternal(db, slug, true);
}

/**
 * Get questionnaire by slug (internal - can include private)
 */
export async function getQuestionnaireBySlugInternal(
  db: typeof DbInstance,
  slug: string,
  publicOnly = false,
) {
  const whereConditions = [
    eq(questionnaire.slug, slug),
    eq(questionnaire.status, "active"),
  ];

  if (publicOnly) {
    whereConditions.push(eq(questionnaire.isPublic, true));
  }

  const q = await db.query.questionnaire.findFirst({
    where: and(...whereConditions),
  });

  if (!q) {
    return null;
  }

  // Get active version
  const activeVersion = await db.query.questionnaireVersion.findFirst({
    where: and(
      eq(questionnaireVersion.questionnaireId, q.id),
      eq(questionnaireVersion.isActive, true),
    ),
    orderBy: [desc(questionnaireVersion.version)],
  });

  if (!activeVersion) {
    throw new Error("No active version found for this questionnaire");
  }

  // Get questionnaire items with questions in one query using JOIN
  const itemsWithQuestions = await db
    .select({
      // Questionnaire item fields
      itemId: questionnaireItem.id,
      questionnaireVersionId: questionnaireItem.questionnaireVersionId,
      questionId: questionnaireItem.questionId,
      position: questionnaireItem.position,
      section: questionnaireItem.section,
      isRequired: questionnaireItem.isRequired,
      itemCreatedAt: questionnaireItem.createdAt,
      // Question fields
      questionCode: questionBankItem.code,
      questionPrompt: questionBankItem.prompt,
      questionTypeCode: questionBankItem.questionTypeCode,
      questionConfigJson: questionBankItem.configJson,
      questionCreatedAt: questionBankItem.createdAt,
      questionUpdatedAt: questionBankItem.updatedAt,
    })
    .from(questionnaireItem)
    .innerJoin(
      questionBankItem,
      eq(questionnaireItem.questionId, questionBankItem.id),
    )
    .where(eq(questionnaireItem.questionnaireVersionId, activeVersion.id))
    .orderBy(questionnaireItem.position);

  // Get all question IDs for choice questions
  const choiceQuestionIds = itemsWithQuestions
    .filter(
      (item) =>
        item.questionTypeCode === "single_choice" ||
        item.questionTypeCode === "multi_choice",
    )
    .map((item) => item.questionId);

  // Fetch all options for choice questions in one query
  const allOptions =
    choiceQuestionIds.length > 0
      ? await db
          .select()
          .from(questionOption)
          .where(inArray(questionOption.questionId, choiceQuestionIds))
          .orderBy(questionOption.position)
      : [];

  // Group options by questionId
  const optionsByQuestionId = new Map<string, typeof allOptions>();
  for (const option of allOptions) {
    if (!optionsByQuestionId.has(option.questionId)) {
      optionsByQuestionId.set(option.questionId, []);
    }
    optionsByQuestionId.get(option.questionId)!.push(option);
  }

  // Map to final structure
  const validItems = itemsWithQuestions.map((item) => ({
    id: item.itemId,
    questionnaireVersionId: item.questionnaireVersionId,
    questionId: item.questionId,
    position: item.position,
    section: item.section,
    isRequired: item.isRequired,
    createdAt: item.itemCreatedAt,
    question: {
      id: item.questionId,
      code: item.questionCode,
      prompt: item.questionPrompt,
      questionTypeCode: item.questionTypeCode,
      configJson: item.questionConfigJson,
      createdAt: item.questionCreatedAt,
      updatedAt: item.questionUpdatedAt,
      options:
        item.questionTypeCode === "single_choice" ||
        item.questionTypeCode === "multi_choice"
          ? (optionsByQuestionId.get(item.questionId) ?? [])
          : [],
    },
  }));

  return {
    ...q,
    version: activeVersion,
    items: validItems,
  };
}

export async function getQuestionnaireMetadata(
  db: typeof DbInstance,
  slug: string,
) {
  // Optimized: Use JOIN to fetch questionnaire and active version in one query
  const result = await db
    .select({
      // Questionnaire fields
      id: questionnaire.id,
      slug: questionnaire.slug,
      title: questionnaire.title,
      description: questionnaire.description,
      isPublic: questionnaire.isPublic,
      status: questionnaire.status,
      createdAt: questionnaire.createdAt,
      updatedAt: questionnaire.updatedAt,
      // Version fields
      versionId: questionnaireVersion.id,
      version: questionnaireVersion.version,
      versionQuestionnaireId: questionnaireVersion.questionnaireId,
      isActive: questionnaireVersion.isActive,
      publishedAt: questionnaireVersion.publishedAt,
      versionMetadataJson: questionnaireVersion.metadataJson,
      versionCreatedAt: questionnaireVersion.createdAt,
    })
    .from(questionnaire)
    .innerJoin(
      questionnaireVersion,
      and(
        eq(questionnaireVersion.questionnaireId, questionnaire.id),
        eq(questionnaireVersion.isActive, true),
      ),
    )
    .where(
      and(
        eq(questionnaire.slug, slug),
        eq(questionnaire.isPublic, true),
        eq(questionnaire.status, "active"),
      ),
    )
    .orderBy(desc(questionnaireVersion.version))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    return null;
  }

  const row = result[0];

  if (!row.versionId) {
    throw new Error("No active version found for this questionnaire");
  }

  // Return only metadata - no items/questions
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isPublic: row.isPublic,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: {
      id: row.versionId,
      version: row.version,
      questionnaireId: row.versionQuestionnaireId,
      isActive: row.isActive,
      publishedAt: row.publishedAt,
      metadataJson: row.versionMetadataJson,
      createdAt: row.versionCreatedAt,
    },
  };
}

export async function getUserQuestionnaireAccess(
  db: typeof DbInstance,
  userId: string,
) {
  const accesses = await db
    .select()
    .from(userQuestionnaireAccess)
    .where(eq(userQuestionnaireAccess.userId, userId));

  if (accesses.length === 0) {
    return [];
  }

  const questionnaireIds = accesses.map((a) => a.questionnaireId);

  const questionnaires = await db
    .select()
    .from(questionnaire)
    .where(inArray(questionnaire.id, questionnaireIds));

  const activeVersions = await db
    .select()
    .from(questionnaireVersion)
    .where(
      and(
        inArray(questionnaireVersion.questionnaireId, questionnaireIds),
        eq(questionnaireVersion.isActive, true),
      ),
    )
    .orderBy(desc(questionnaireVersion.version));

  const questionnaireMap = new Map(questionnaires.map((q) => [q.id, q]));
  const versionMap = new Map<
    string,
    (typeof activeVersions)[number] | undefined
  >();
  for (const v of activeVersions) {
    if (!versionMap.has(v.questionnaireId)) {
      versionMap.set(v.questionnaireId, v);
    }
  }

  const questionnairesWithVersions = accesses.map((access) => {
    const q = questionnaireMap.get(access.questionnaireId);
    if (!q) return null;

    return {
      ...q,
      activeVersion: versionMap.get(q.id),
    };
  });

  return questionnairesWithVersions.filter(
    (q): q is NonNullable<typeof q> => q !== null,
  );
}

export async function hasUserQuestionnaireAccess(
  db: typeof DbInstance,
  userId: string,
  questionnaireId: string,
) {
  const access = await db.query.userQuestionnaireAccess.findFirst({
    where: and(
      eq(userQuestionnaireAccess.userId, userId),
      eq(userQuestionnaireAccess.questionnaireId, questionnaireId),
    ),
  });

  return Boolean(access);
}

export async function getQuestionnaireById(db: typeof DbInstance, id: string) {
  const result = await db
    .select({
      id: questionnaire.id,
      slug: questionnaire.slug,
      title: questionnaire.title,
      description: questionnaire.description,
      isPublic: questionnaire.isPublic,
      status: questionnaire.status,
      createdAt: questionnaire.createdAt,
      updatedAt: questionnaire.updatedAt,
      versionId: questionnaireVersion.id,
      version: questionnaireVersion.version,
      versionQuestionnaireId: questionnaireVersion.questionnaireId,
      isActive: questionnaireVersion.isActive,
      publishedAt: questionnaireVersion.publishedAt,
      versionMetadataJson: questionnaireVersion.metadataJson,
      versionCreatedAt: questionnaireVersion.createdAt,
    })
    .from(questionnaire)
    .innerJoin(
      questionnaireVersion,
      and(
        eq(questionnaireVersion.questionnaireId, questionnaire.id),
        eq(questionnaireVersion.isActive, true),
      ),
    )
    .where(eq(questionnaire.id, id))
    .orderBy(desc(questionnaireVersion.version))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    return null;
  }

  const row = result[0];

  if (!row.versionId) {
    throw new Error("No active version found for this questionnaire");
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    isPublic: row.isPublic,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    activeVersion: {
      id: row.versionId,
      version: row.version,
      questionnaireId: row.versionQuestionnaireId,
      isActive: row.isActive,
      publishedAt: row.publishedAt,
      metadataJson: row.versionMetadataJson,
      createdAt: row.versionCreatedAt,
    },
  };
}
