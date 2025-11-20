import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  questionnaire,
  questionnaireVersion,
  questionBankItem,
  questionOption,
  questionnaireItem,
  userQuestionnaireAccess,
  assessmentSession,
  subjectProfile,
  response,
} from "@/server/db/schema";
import { mapResponseValueToData } from "@/server/lib/responses";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";

/**
 * Get or create a subject profile for a user
 */
async function getOrCreateSubjectProfile(
  dbInstance: typeof db,
  userId: string,
  userName: string | null,
  userEmail: string,
) {
  let subjectProfileRecord = await dbInstance.query.subjectProfile.findFirst({
    where: and(
      eq(subjectProfile.userId, userId),
      eq(subjectProfile.subjectType, "human"),
    ),
  });

  if (!subjectProfileRecord) {
    // Create new subject profile
    const subjectProfileId = crypto.randomUUID();
    const now = new Date();

    await dbInstance.insert(subjectProfile).values({
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

export const questionnairesRouter = createTRPCRouter({
  /**
   * Get all public questionnaires
   */
  getPublic: publicProcedure.query(async ({ ctx }) => {
    const publicQuestionnaires = await ctx.db.query.questionnaire.findMany({
      where: eq(questionnaire.isPublic, true),
      orderBy: [desc(questionnaire.createdAt)],
    });

    // Get active version for each questionnaire
    const withVersions = await Promise.all(
      publicQuestionnaires.map(async (q) => {
        const activeVersion = await ctx.db.query.questionnaireVersion.findFirst(
          {
            where: and(
              eq(questionnaireVersion.questionnaireId, q.id),
              eq(questionnaireVersion.isActive, true),
            ),
            orderBy: [desc(questionnaireVersion.version)],
          },
        );

        return {
          ...q,
          activeVersion,
        };
      }),
    );

    return withVersions;
  }),

  /**
   * Get questionnaire by slug with questions
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const q = await ctx.db.query.questionnaire.findFirst({
        where: eq(questionnaire.slug, input.slug),
      });

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      // Get active version
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
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
      const itemsWithQuestions = await ctx.db
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
          ? await ctx.db
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
    }),

  /**
   * Get questionnaire metadata by slug (lightweight, for SSR)
   * Returns only questionnaire metadata and version info, no items/questions
   */
  getMetaBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // Optimized: Use JOIN to fetch questionnaire and active version in one query
      const result = await ctx.db
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
        .where(eq(questionnaire.slug, input.slug))
        .orderBy(desc(questionnaireVersion.version))
        .limit(1);

      if (result.length === 0 || !result[0]) {
        throw new Error("Questionnaire not found");
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
    }),

  /**
   * Get user's accessible private questionnaires
   */
  getUserAccess: protectedProcedure.query(async ({ ctx }) => {
    const accesses = await ctx.db
      .select()
      .from(userQuestionnaireAccess)
      .where(eq(userQuestionnaireAccess.userId, ctx.user.id));

    const questionnairesWithVersions = await Promise.all(
      accesses.map(async (access) => {
        const q = await ctx.db.query.questionnaire.findFirst({
          where: eq(questionnaire.id, access.questionnaireId),
        });

        if (!q) {
          return null;
        }

        const activeVersion = await ctx.db.query.questionnaireVersion.findFirst(
          {
            where: and(
              eq(questionnaireVersion.questionnaireId, q.id),
              eq(questionnaireVersion.isActive, true),
            ),
            orderBy: [desc(questionnaireVersion.version)],
          },
        );

        return {
          ...q,
          activeVersion,
        };
      }),
    );

    return questionnairesWithVersions.filter(
      (q): q is NonNullable<typeof q> => q !== null,
    );
  }),

  /**
   * Start a new session for a questionnaire by slug
   * This is the preferred method as it's more user-friendly
   */
  startSessionBySlug: protectedProcedure
    .input(
      z.object({
        questionnaireSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Lookup questionnaire by slug
      const q = await ctx.db.query.questionnaire.findFirst({
        where: eq(questionnaire.slug, input.questionnaireSlug),
      });

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      // Check if user has access (public or private access)
      if (!q.isPublic) {
        // Check private access
        const access = await ctx.db.query.userQuestionnaireAccess.findFirst({
          where: and(
            eq(userQuestionnaireAccess.userId, ctx.user.id),
            eq(userQuestionnaireAccess.questionnaireId, q.id),
          ),
        });

        if (!access) {
          throw new Error("You do not have access to this questionnaire");
        }
      }

      // Get active version
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, q.id),
          eq(questionnaireVersion.isActive, true),
        ),
        orderBy: [desc(questionnaireVersion.version)],
      });

      if (!activeVersion) {
        throw new Error("No active version found for this questionnaire");
      }

      // Get or create subject profile for user
      const subjectProfileRecord = await getOrCreateSubjectProfile(
        ctx.db,
        ctx.user.id,
        ctx.user.name,
        ctx.user.email,
      );

      // Check for existing incomplete session
      const existingSession = await ctx.db.query.assessmentSession.findFirst({
        where: and(
          eq(assessmentSession.questionnaireVersionId, activeVersion.id),
          eq(assessmentSession.subjectProfileId, subjectProfileRecord.id),
          eq(assessmentSession.status, "in_progress"),
        ),
        orderBy: [desc(assessmentSession.createdAt)],
      });

      if (existingSession) {
        return {
          sessionId: existingSession.id,
          slug: input.questionnaireSlug,
        };
      }

      // Create new session
      const sessionId = crypto.randomUUID();
      const now = new Date();

      await ctx.db.insert(assessmentSession).values({
        id: sessionId,
        questionnaireVersionId: activeVersion.id,
        subjectProfileId: subjectProfileRecord.id,
        userId: ctx.user.id,
        status: "in_progress",
        startedAt: now,
        completedAt: null,
        metadataJson: null,
        createdAt: now,
        updatedAt: now,
      });

      return {
        sessionId,
        slug: input.questionnaireSlug,
      };
    }),

  /**
   * Start a new session for a questionnaire by ID
   * Kept for backward compatibility
   */
  startSession: protectedProcedure
    .input(
      z.object({
        questionnaireId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get active version
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
          eq(questionnaireVersion.isActive, true),
        ),
        orderBy: [desc(questionnaireVersion.version)],
      });

      if (!activeVersion) {
        throw new Error("No active version found for this questionnaire");
      }

      // Check if user has access (public or private access)
      const q = await ctx.db.query.questionnaire.findFirst({
        where: eq(questionnaire.id, input.questionnaireId),
      });

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      if (!q.isPublic) {
        // Check private access
        const access = await ctx.db.query.userQuestionnaireAccess.findFirst({
          where: and(
            eq(userQuestionnaireAccess.userId, ctx.user.id),
            eq(userQuestionnaireAccess.questionnaireId, input.questionnaireId),
          ),
        });

        if (!access) {
          throw new Error("You do not have access to this questionnaire");
        }
      }

      // Get or create subject profile for user
      const subjectProfileRecord = await getOrCreateSubjectProfile(
        ctx.db,
        ctx.user.id,
        ctx.user.name,
        ctx.user.email,
      );

      // Check for existing incomplete session
      const existingSession = await ctx.db.query.assessmentSession.findFirst({
        where: and(
          eq(assessmentSession.questionnaireVersionId, activeVersion.id),
          eq(assessmentSession.subjectProfileId, subjectProfileRecord.id),
          eq(assessmentSession.status, "in_progress"),
        ),
        orderBy: [desc(assessmentSession.createdAt)],
      });

      if (existingSession) {
        return {
          sessionId: existingSession.id,
          questionnaireVersionId: activeVersion.id,
        };
      }

      // Create new session
      const sessionId = crypto.randomUUID();
      const now = new Date();

      await ctx.db.insert(assessmentSession).values({
        id: sessionId,
        questionnaireVersionId: activeVersion.id,
        subjectProfileId: subjectProfileRecord.id,
        userId: ctx.user.id,
        status: "in_progress",
        startedAt: now,
        completedAt: null,
        metadataJson: null,
        createdAt: now,
        updatedAt: now,
      });

      return {
        sessionId,
        questionnaireVersionId: activeVersion.id,
      };
    }),

  /**
   * Get session with questions and existing responses
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.query.assessmentSession.findFirst({
        where: eq(assessmentSession.id, input.sessionId),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      // Verify ownership
      if (session.userId !== ctx.user.id) {
        throw new Error("Unauthorized - session does not belong to user");
      }

      // Get questionnaire version
      const version = await ctx.db.query.questionnaireVersion.findFirst({
        where: eq(questionnaireVersion.id, session.questionnaireVersionId),
      });

      if (!version) {
        throw new Error("Questionnaire version not found");
      }

      // Get questionnaire
      const q = await ctx.db.query.questionnaire.findFirst({
        where: eq(questionnaire.id, version.questionnaireId),
      });

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      // Get questionnaire items
      const items = await ctx.db
        .select()
        .from(questionnaireItem)
        .where(eq(questionnaireItem.questionnaireVersionId, version.id))
        .orderBy(questionnaireItem.position);

      // Get questions and existing responses
      const itemsWithQuestions = await Promise.all(
        items.map(async (item) => {
          const question = await ctx.db.query.questionBankItem.findFirst({
            where: eq(questionBankItem.id, item.questionId),
          });

          if (!question) {
            return null;
          }

          // Get options if this is a choice question
          const options =
            question.questionTypeCode === "single_choice" ||
            question.questionTypeCode === "multi_choice"
              ? await ctx.db
                  .select()
                  .from(questionOption)
                  .where(eq(questionOption.questionId, question.id))
                  .orderBy(questionOption.position)
              : [];

          // Get existing response
          const existingResponse = await ctx.db.query.response.findFirst({
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
    }),

  /**
   * Save a response (auto-save)
   */
  saveResponse: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        questionId: z.string(),
        value: z.union([
          z.string(), // For single_choice or text
          z.number(), // For scalar
          z.boolean(), // For boolean
          z.array(z.string()), // For multi_choice
        ]),
        selectedOptionId: z.string().optional(), // For single_choice questions
        selectedOptionIds: z.array(z.string()).optional(), // For multi_choice questions
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify session ownership
      const session = await ctx.db.query.assessmentSession.findFirst({
        where: eq(assessmentSession.id, input.sessionId),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.userId !== ctx.user.id) {
        throw new Error("Unauthorized - session does not belong to user");
      }

      if (session.status === "completed") {
        throw new Error("Cannot modify responses for completed session");
      }

      // Validate that questionId belongs to this session's questionnaire version
      // questionnaireVersionId is not null in schema, but TypeScript needs help with type inference
      const questionnaireVersionId = session.questionnaireVersionId;
      if (!questionnaireVersionId) {
        throw new Error("Session missing questionnaire version");
      }
      const item = await ctx.db.query.questionnaireItem.findFirst({
        where: and(
          eq(questionnaireItem.questionnaireVersionId, questionnaireVersionId),
          eq(questionnaireItem.questionId, input.questionId),
        ),
      });

      if (!item) {
        throw new Error(
          "Question does not belong to this session's questionnaire",
        );
      }

      // Get question to determine type
      const question = await ctx.db.query.questionBankItem.findFirst({
        where: eq(questionBankItem.id, input.questionId),
      });

      if (!question) {
        throw new Error("Question not found");
      }

      // Check for existing response
      const existingResponse = await ctx.db.query.response.findFirst({
        where: and(
          eq(response.assessmentSessionId, input.sessionId),
          eq(response.questionId, input.questionId),
        ),
      });

      const now = new Date();
      const responseData = mapResponseValueToData(
        question.questionTypeCode,
        {
          value: input.value,
          selectedOptionId: input.selectedOptionId,
          selectedOptionIds: input.selectedOptionIds,
        },
        {
          assessmentSessionId: input.sessionId,
          questionId: input.questionId,
          updatedAt: now,
        },
      );

      if (existingResponse) {
        // Update existing response
        await ctx.db
          .update(response)
          .set(responseData)
          .where(eq(response.id, existingResponse.id));
      } else {
        // Create new response
        const responseId = crypto.randomUUID();
        await ctx.db.insert(response).values({
          id: responseId,
          ...responseData,
          createdAt: now,
        });
      }

      // Update session updatedAt
      await ctx.db
        .update(assessmentSession)
        .set({ updatedAt: now })
        .where(eq(assessmentSession.id, input.sessionId));

      return { success: true };
    }),

  /**
   * Save multiple responses in a batch (for completion flow)
   */
  saveResponsesBatch: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        responses: z.array(
          z.object({
            questionId: z.string(),
            value: z.union([
              z.string(), // For single_choice or text
              z.number(), // For scalar
              z.boolean(), // For boolean
              z.array(z.string()), // For multi_choice
            ]),
            selectedOptionId: z.string().optional(), // For single_choice questions
            selectedOptionIds: z.array(z.string()).optional(), // For multi_choice questions
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      logger.dev("[BATCH_SAVE] Mutation called:", {
        sessionId: input.sessionId,
        responseCount: input.responses.length,
        questionIds: input.responses.map((r) => r.questionId).slice(0, 5), // Sample
        allQuestionIds: input.responses.map((r) => r.questionId),
      });

      // Validate responses array is not empty
      if (input.responses.length === 0) {
        logger.error("[BATCH_SAVE] Empty responses array rejected");
        throw new Error("Cannot save empty responses array");
      }

      // Verify session ownership
      const session = await ctx.db.query.assessmentSession.findFirst({
        where: eq(assessmentSession.id, input.sessionId),
      });

      if (!session) {
        logger.error("[BATCH_SAVE] Session not found:", input.sessionId);
        throw new Error("Session not found");
      }

      logger.dev("[BATCH_SAVE] Session found:", {
        sessionId: session.id,
        status: session.status,
        userId: session.userId,
        subjectProfileId: session.subjectProfileId,
        questionnaireVersionId: session.questionnaireVersionId,
        currentUserId: ctx.user.id,
      });

      if (session.userId !== ctx.user.id) {
        logger.error(
          "[BATCH_SAVE] Unauthorized - session belongs to different user",
        );
        throw new Error("Unauthorized - session does not belong to user");
      }

      if (session.status === "completed") {
        logger.error("[BATCH_SAVE] Cannot modify completed session");
        throw new Error("Cannot modify responses for completed session");
      }

      // Validate all questionIds belong to this session's questionnaire version
      // questionnaireVersionId is not null in schema, but TypeScript needs help with type inference
      const questionnaireVersionId = session.questionnaireVersionId;
      if (!questionnaireVersionId) {
        throw new Error("Session missing questionnaire version");
      }
      const questionIds = input.responses.map((r) => r.questionId);
      const validQuestionnaireItems = await ctx.db
        .select()
        .from(questionnaireItem)
        .where(
          and(
            eq(
              questionnaireItem.questionnaireVersionId,
              questionnaireVersionId,
            ),
            inArray(questionnaireItem.questionId, questionIds),
          ),
        );

      const validQuestionIds = new Set(
        validQuestionnaireItems.map((item) => item.questionId),
      );
      const invalidQuestionIds = questionIds.filter(
        (id) => !validQuestionIds.has(id),
      );

      if (invalidQuestionIds.length > 0) {
        logger.error("[BATCH_SAVE] Invalid questionIds:", invalidQuestionIds);
        throw new Error(
          `Questions do not belong to this session's questionnaire: ${invalidQuestionIds.join(", ")}`,
        );
      }

      const now = new Date();
      let savedCount = 0;

      logger.dev("[BATCH_SAVE] Starting transaction", {
        sessionId: input.sessionId,
        responseCount: input.responses.length,
      });

      // Process all responses in a transaction (all-or-nothing)
      try {
        await ctx.db.transaction(async (tx) => {
          logger.dev("[BATCH_SAVE] Transaction started");
          for (let i = 0; i < input.responses.length; i++) {
            const responseInput = input.responses[i];
            if (!responseInput) {
              logger.error(
                `[BATCH_SAVE] Response ${i + 1} is undefined, skipping`,
              );
              continue;
            }
            logger.dev(
              `[BATCH_SAVE] Processing response ${i + 1}/${input.responses.length}:`,
              {
                questionId: responseInput.questionId,
                hasValue: responseInput.value !== undefined,
                valueType: typeof responseInput.value,
              },
            );

            // Get question to determine type
            const question = await tx.query.questionBankItem.findFirst({
              where: eq(questionBankItem.id, responseInput.questionId),
            });

            if (!question) {
              logger.error(
                `[BATCH_SAVE] Question not found: ${responseInput.questionId}`,
              );
              throw new Error(
                `Question not found: ${responseInput.questionId}`,
              );
            }

            // Check for existing response
            const existingResponse = await tx.query.response.findFirst({
              where: and(
                eq(response.assessmentSessionId, input.sessionId),
                eq(response.questionId, responseInput.questionId),
              ),
            });

            logger.dev(`[BATCH_SAVE] Response ${i + 1} - existing:`, {
              questionId: responseInput.questionId,
              hasExisting: !!existingResponse,
              existingResponseId: existingResponse?.id,
            });

            const responseData = mapResponseValueToData(
              question.questionTypeCode,
              {
                value: responseInput.value,
                selectedOptionId: responseInput.selectedOptionId,
                selectedOptionIds: responseInput.selectedOptionIds,
              },
              {
                assessmentSessionId: input.sessionId,
                questionId: responseInput.questionId,
                updatedAt: now,
              },
            );

            if (existingResponse) {
              // Update existing response
              logger.dev(`[BATCH_SAVE] Updating existing response ${i + 1}:`, {
                responseId: existingResponse.id,
                questionId: responseInput.questionId,
              });
              await tx
                .update(response)
                .set(responseData)
                .where(eq(response.id, existingResponse.id));
            } else {
              // Create new response
              const responseId = crypto.randomUUID();
              logger.dev(`[BATCH_SAVE] Creating new response ${i + 1}:`, {
                responseId,
                questionId: responseInput.questionId,
              });
              await tx.insert(response).values({
                id: responseId,
                ...responseData,
                createdAt: now,
              });
            }

            savedCount++;
            logger.dev(
              `[BATCH_SAVE] Response ${i + 1} saved successfully, total: ${savedCount}`,
            );
          }

          // Update session updatedAt once at the end
          await tx
            .update(assessmentSession)
            .set({ updatedAt: now })
            .where(eq(assessmentSession.id, input.sessionId));

          logger.dev("[BATCH_SAVE] Transaction committing:", {
            savedCount,
            expectedCount: input.responses.length,
            sessionId: input.sessionId,
          });
        });

        logger.dev("[BATCH_SAVE] Transaction committed successfully");

        // Verify responses actually exist in DB after transaction
        const verifyResponses = await ctx.db.query.response.findMany({
          where: eq(response.assessmentSessionId, input.sessionId),
        });

        logger.dev("[BATCH_SAVE] DB verification after commit:", {
          sessionId: input.sessionId,
          responsesInDB: verifyResponses.length,
          expectedCount: input.responses.length,
          responseQuestionIds: verifyResponses.map((r) => r.questionId),
        });

        return {
          success: true,
          savedCount,
          failed: [],
        };
      } catch (error) {
        // Transaction automatically rolls back on error
        logger.error("[BATCH_SAVE] Transaction failed/rolled back:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    }),

  /**
   * Complete a session
   */
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify session ownership
      const session = await ctx.db.query.assessmentSession.findFirst({
        where: eq(assessmentSession.id, input.sessionId),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.userId !== ctx.user.id) {
        throw new Error("Unauthorized - session does not belong to user");
      }

      if (session.status === "completed") {
        return { success: true, message: "Session already completed" };
      }

      const now = new Date();

      // Update session status
      await ctx.db
        .update(assessmentSession)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(assessmentSession.id, input.sessionId));

      return { success: true };
    }),

  /**
   * Get incomplete sessions for the current user for a specific questionnaire
   */
  getIncompleteSessions: protectedProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get active version for this questionnaire
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
          eq(questionnaireVersion.isActive, true),
        ),
      });

      if (!activeVersion) {
        return [];
      }

      // Get user's subject profile
      const userProfile = await ctx.db.query.subjectProfile.findFirst({
        where: and(
          eq(subjectProfile.userId, ctx.user.id),
          eq(subjectProfile.subjectType, "human"),
        ),
      });

      if (!userProfile) {
        return [];
      }

      // Get incomplete sessions for this user and questionnaire version
      const sessions = await ctx.db
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
            eq(assessmentSession.userId, ctx.user.id),
            eq(assessmentSession.status, "in_progress"),
          ),
        )
        .orderBy(desc(assessmentSession.updatedAt));

      return sessions;
    }),

  /**
   * Get user's session IDs and metadata for a questionnaire
   * Lightweight endpoint for cache invalidation checks
   */
  getUserSessionIds: protectedProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get active version for this questionnaire
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
          eq(questionnaireVersion.isActive, true),
        ),
      });

      if (!activeVersion) {
        return { sessions: [] };
      }

      // Get user's subject profile
      const userProfile = await ctx.db.query.subjectProfile.findFirst({
        where: and(
          eq(subjectProfile.userId, ctx.user.id),
          eq(subjectProfile.subjectType, "human"),
        ),
      });

      if (!userProfile) {
        return { sessions: [] };
      }

      // Get all user's sessions (completed and in_progress) for this questionnaire
      const sessions = await ctx.db
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
            eq(assessmentSession.userId, ctx.user.id),
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
    }),

  /**
   * Get version info for a questionnaire (lightweight)
   * Used for cache invalidation checks
   */
  getVersionInfo: publicProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
          eq(questionnaireVersion.isActive, true),
        ),
        orderBy: [desc(questionnaireVersion.version)],
      });

      if (!activeVersion) {
        throw new Error("No active version found");
      }

      return {
        questionnaireId: input.questionnaireId,
        version: activeVersion.version,
        versionId: activeVersion.id,
        publishedAt: activeVersion.publishedAt,
      };
    }),

  /**
   * Get analysis data for a questionnaire (for scoring/analysis)
   * Returns analysis model, trait dimensions, and question-trait mappings
   * Note: Returns empty data if analysis tables don't exist yet
   */
  getAnalysisData: publicProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async () => {
      // For now, return empty data since analysis tables may not exist yet
      // This will be implemented when analysis tables are added to the schema
      return {
        analysisModel: null,
        traitDimensions: [],
        questionTraitMappings: [],
      };
    }),
});
