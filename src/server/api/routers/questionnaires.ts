import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import * as questionnaireQueries from "@/server/db/queries/questionnaires";
import * as sessionQueries from "@/server/db/queries/sessions";
import * as responseQueries from "@/server/db/queries/responses";

export const questionnairesRouter = createTRPCRouter({
  /**
   * Get all public questionnaires
   */
  getPublic: publicProcedure.query(async ({ ctx }) => {
    return questionnaireQueries.getPublicQuestionnaires(ctx.db);
  }),

  /**
   * Get questionnaire by slug with questions
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await questionnaireQueries.getQuestionnaireBySlug(
        ctx.db,
        input.slug,
      );

      if (!result) {
        throw new Error("Questionnaire not found");
      }

      return result;
    }),

  /**
   * Get questionnaire metadata by slug (lightweight, for SSR)
   * Returns only questionnaire metadata and version info, no items/questions
   */
  getMetaBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await questionnaireQueries.getQuestionnaireMetadata(
        ctx.db,
        input.slug,
      );

      if (!result) {
        throw new Error("Questionnaire not found");
      }

      return result;
    }),

  /**
   * Get user's accessible private questionnaires
   */
  getUserAccess: protectedProcedure.query(async ({ ctx }) => {
    return questionnaireQueries.getUserQuestionnaireAccess(ctx.db, ctx.user.id);
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
      // Lookup questionnaire by slug (include private for access check)
      const q = await questionnaireQueries.getQuestionnaireBySlugInternal(
        ctx.db,
        input.questionnaireSlug,
        false, // Allow private questionnaires
      );

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      // Check if user has access (public or private access)
      if (!q.isPublic) {
        // Check private access
        const access = await questionnaireQueries.getUserQuestionnaireAccess(
          ctx.db,
          ctx.user.id,
        );
        const hasAccess = access.some((a) => a.id === q.id);

        if (!hasAccess) {
          throw new Error("You do not have access to this questionnaire");
        }
      }

      // Get or create subject profile for user
      const subjectProfileRecord =
        await sessionQueries.getOrCreateSubjectProfile(
          ctx.db,
          ctx.user.id,
          ctx.user.name,
          ctx.user.email,
        );

      // Create or get existing session
      const session = await sessionQueries.createAssessmentSession(ctx.db, {
        questionnaireVersionId: q.version.id,
        subjectProfileId: subjectProfileRecord.id,
        userId: ctx.user.id,
      });

      return {
        sessionId: session.id,
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
      const q = await questionnaireQueries.getQuestionnaireById(
        ctx.db,
        input.questionnaireId,
      );

      if (!q) {
        throw new Error("Questionnaire not found");
      }

      // Check if user has access (public or private access)
      if (!q.isPublic) {
        // Check private access
        const access = await questionnaireQueries.getUserQuestionnaireAccess(
          ctx.db,
          ctx.user.id,
        );
        const hasAccess = access.some((a) => a.id === q.id);

        if (!hasAccess) {
          throw new Error("You do not have access to this questionnaire");
        }
      }

      // Get or create subject profile for user
      const subjectProfileRecord =
        await sessionQueries.getOrCreateSubjectProfile(
          ctx.db,
          ctx.user.id,
          ctx.user.name,
          ctx.user.email,
        );

      // Create or get existing session
      const session = await sessionQueries.createAssessmentSession(ctx.db, {
        questionnaireVersionId: q.activeVersion.id,
        subjectProfileId: subjectProfileRecord.id,
        userId: ctx.user.id,
      });

      return {
        sessionId: session.id,
        questionnaireVersionId: q.activeVersion.id,
      };
    }),

  /**
   * Get session with questions and existing responses
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await sessionQueries.getAssessmentSession(
        ctx.db,
        input.sessionId,
        ctx.user.id,
      );

      if (!result) {
        throw new Error("Session not found");
      }

      return result;
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
      return responseQueries.saveResponse(ctx.db, {
        ...input,
        userId: ctx.user.id,
      });
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
      return responseQueries.saveResponsesBatch(ctx.db, {
        ...input,
        userId: ctx.user.id,
      });
    }),

  /**
   * Complete a session
   */
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return sessionQueries.completeSession(
        ctx.db,
        input.sessionId,
        ctx.user.id,
      );
    }),

  /**
   * Get incomplete sessions for the current user for a specific questionnaire
   */
  getIncompleteSessions: protectedProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      return sessionQueries.getIncompleteSessions(
        ctx.db,
        input.questionnaireId,
        ctx.user.id,
      );
    }),

  /**
   * Get user's session IDs and metadata for a questionnaire
   * Lightweight endpoint for cache invalidation checks
   */
  getUserSessionIds: protectedProcedure
    .input(z.object({ questionnaireId: z.string() }))
    .query(async ({ ctx, input }) => {
      return sessionQueries.getUserSessionIds(
        ctx.db,
        input.questionnaireId,
        ctx.user.id,
      );
    }),
});
