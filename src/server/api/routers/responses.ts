import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  response,
  assessmentSession,
  subjectProfile,
  questionnaireVersion,
} from "@/server/db/schema";
import { logger } from "@/lib/logger";

export const responsesRouter = createTRPCRouter({
  /**
   * Get all responses for a session (protected)
   */
  getBySession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      // Get all responses for this session
      const responses = await ctx.db
        .select()
        .from(response)
        .where(eq(response.assessmentSessionId, input.sessionId));

      return responses;
    }),

  /**
   * Get aggregated responses for analysis pages (public)
   * Returns aggregated data for human sessions only (excludes AI/LLM models)
   */
  getAggregated: publicProcedure
    .input(
      z.object({
        questionnaireId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get active version for this questionnaire
      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
          eq(questionnaireVersion.isActive, true),
        ),
      });

      if (!activeVersion) {
        return {
          totalSessions: 0,
          questionnaireId: input.questionnaireId,
          sessions: [],
          responses: [],
        };
      }

      // Get all human subject profiles
      // Using direct query builder for better performance with index
      let humanProfiles;
      try {
        humanProfiles = await ctx.db
          .select({ id: subjectProfile.id })
          .from(subjectProfile)
          .where(eq(subjectProfile.subjectType, "human"));
      } catch (error) {
        logger.error("Failed to fetch human subject profiles:", error);
        // Return empty result on error rather than crashing
        return {
          totalSessions: 0,
          questionnaireId: input.questionnaireId,
          sessions: [],
          responses: [],
        };
      }

      const humanProfileIds = humanProfiles.map((p) => p.id);

      logger.dev("[QUERY_AGGREGATED] Human profiles:", {
        questionnaireId: input.questionnaireId,
        humanProfileCount: humanProfileIds.length,
        humanProfileIds: humanProfileIds.slice(0, 5), // Sample first 5
      });

      if (humanProfileIds.length === 0) {
        logger.dev(
          "[QUERY_AGGREGATED] No human profiles found, returning empty",
        );
        return {
          totalSessions: 0,
          questionnaireId: input.questionnaireId,
          sessions: [],
          responses: [],
        };
      }

      // Get all completed sessions for this questionnaire version from human subjects only
      // Include completedAt and other metadata for default selection logic
      logger.dev("[QUERY_AGGREGATED] Querying sessions:", {
        questionnaireId: input.questionnaireId,
        versionId: activeVersion.id,
        status: "completed",
        humanProfileIdsCount: humanProfileIds.length,
      });

      const humanSessions = await ctx.db
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
            inArray(assessmentSession.subjectProfileId, humanProfileIds),
          ),
        );

      logger.dev("[QUERY_AGGREGATED] Sessions found:", {
        sessionCount: humanSessions.length,
        sessions: humanSessions.map((s) => ({
          id: s.id.slice(0, 8),
          status: s.status,
          subjectProfileId: s.subjectProfileId,
          versionId: s.questionnaireVersionId,
          completedAt: s.completedAt,
        })),
      });

      const sessionIds = humanSessions.map((s) => s.id);

      logger.dev("[QUERY_AGGREGATED] Session IDs to query:", {
        sessionIdCount: sessionIds.length,
        sessionIds: sessionIds.slice(0, 5).map((id) => id.slice(0, 8)), // Sample
      });

      if (sessionIds.length === 0) {
        logger.dev("[QUERY_AGGREGATED] No sessions found, returning empty");
        return {
          totalSessions: 0,
          questionnaireId: input.questionnaireId,
          sessions: [],
          responses: [],
        };
      }

      // Get all responses from human sessions
      logger.dev("[QUERY_AGGREGATED] Querying responses for sessions");
      const humanResponses = await ctx.db
        .select()
        .from(response)
        .where(inArray(response.assessmentSessionId, sessionIds));

      logger.dev("[QUERY_AGGREGATED] Responses found:", {
        responseCount: humanResponses.length,
        responsesBySessionId: humanResponses.reduce(
          (acc, r) => {
            acc[r.assessmentSessionId] = (acc[r.assessmentSessionId] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });

      // Log session and response details for debugging
      const responsesBySession = new Map<string, number>();
      for (const response of humanResponses) {
        const count = responsesBySession.get(response.assessmentSessionId) ?? 0;
        responsesBySession.set(response.assessmentSessionId, count + 1);
      }

      // Log session and response details for debugging
      logger.dev(`[getAggregated] Questionnaire ${input.questionnaireId}:`, {
        totalSessions: humanSessions.length,
        sessions: humanSessions.map((s) => ({
          id: s.id.slice(0, 8),
          completedAt: s.completedAt,
          responseCount: responsesBySession.get(s.id) ?? 0,
        })),
        totalResponses: humanResponses.length,
        sessionsWithResponses: responsesBySession.size,
        sessionsWithoutResponses:
          humanSessions.length - responsesBySession.size,
      });

      return {
        totalSessions: humanSessions.length,
        questionnaireId: input.questionnaireId,
        sessions: humanSessions,
        responses: humanResponses,
      };
    }),

  /**
   * Get AI/LLM model responses for comparison (public)
   * Returns model profiles and their responses for a specific questionnaire
   */
  getModelResponses: publicProcedure
    .input(
      z.object({
        questionnaireId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get active version and model profiles
      // Fetch model profiles with error handling
      const allModelProfilesResult = await ctx.db
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

      const activeVersion = await ctx.db.query.questionnaireVersion.findFirst({
        where: and(
          eq(questionnaireVersion.questionnaireId, input.questionnaireId),
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
      // Include subjectProfileId so we can map responses to models
      const modelSessions = await ctx.db
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
      const modelResponses = await ctx.db
        .select()
        .from(response)
        .where(inArray(response.assessmentSessionId, sessionIds));

      return {
        models: allModelProfiles,
        responses: modelResponses,
        sessions: modelSessions, // Include sessions with subjectProfileId mapping
      };
    }),
});
