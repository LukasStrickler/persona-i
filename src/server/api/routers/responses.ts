import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      if (session.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized - session does not belong to user",
        });
      }

      // Get all responses for this session
      const responses = await ctx.db
        .select()
        .from(response)
        .where(eq(response.assessmentSessionId, input.sessionId));

      return responses;
    }),

  /**
   * Get aggregated responses for analysis pages (protected)
   *
   * PURPOSE & DATA FLOW:
   * ===================
   *
   * This endpoint fetches the current user's own completed test sessions and responses
   * for display on analysis pages (e.g., /tests/disc). It's called client-side via
   * React Query in `useTestAnalysisData` hook.
   *
   * Data Flow:
   * 1. Client calls this endpoint via `api.responses.getAggregated.useQuery()`
   * 2. Returns: { sessions: [...], responses: [...] } for current user only
   * 3. Data flows to `useTestAnalysisData` hook → `loadUserData()` action
   * 4. `loadUserData()` stores data in Zustand store: `state.userSessions` Map
   * 5. Store data is used by analysis components:
   *    - TestAnalysisClient (main analysis page component)
   *    - StoreDataVisualization (debug/development view)
   *    - Analysis helpers (getResponseDistribution, getAggregatedBySection, etc.)
   *    - Selectors (useHumanResponses, useSelectedUserSessions, etc.)
   *
   * Privacy & Security:
   * - Only returns data for `ctx.user.id` (current authenticated user)
   * - Filters by `assessmentSession.userId === ctx.user.id`
   * - No access to other users' sessions or responses
   * - Protected endpoint (requires authentication)
   *
   * Usage Context:
   * - Analysis pages show user's own test results over time
   * - Allows comparing multiple completed sessions
   * - Used for charts, distributions, and response analysis
   * - Data is persisted in Zustand store with localStorage for offline access
   */
  getAggregated: protectedProcedure
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

      // Get user's own completed sessions for this questionnaire version
      // Filter by userId to ensure users only see their own data
      logger.dev("[QUERY_AGGREGATED] Querying user's own sessions:", {
        questionnaireId: input.questionnaireId,
        versionId: activeVersion.id,
        userId: ctx.user.id,
        status: "completed",
      });

      const userSessions = await ctx.db
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
            eq(assessmentSession.userId, ctx.user.id), // Only current user's sessions
          ),
        );

      logger.dev("[QUERY_AGGREGATED] User's sessions found:", {
        sessionCount: userSessions.length,
        sessions: userSessions.map((s) => ({
          id: s.id.slice(0, 8),
          status: s.status,
          subjectProfileId: s.subjectProfileId,
          versionId: s.questionnaireVersionId,
          completedAt: s.completedAt,
        })),
      });

      const sessionIds = userSessions.map((s) => s.id);

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

      // Get responses from user's own sessions only
      logger.dev("[QUERY_AGGREGATED] Querying responses for user's sessions");
      const userResponses = await ctx.db
        .select()
        .from(response)
        .where(inArray(response.assessmentSessionId, sessionIds));

      logger.dev("[QUERY_AGGREGATED] User's responses found:", {
        responseCount: userResponses.length,
        responsesBySessionId: userResponses.reduce(
          (acc, r) => {
            acc[r.assessmentSessionId] = (acc[r.assessmentSessionId] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      });

      // Log session and response details for debugging
      const responsesBySession = new Map<string, number>();
      for (const response of userResponses) {
        const count = responsesBySession.get(response.assessmentSessionId) ?? 0;
        responsesBySession.set(response.assessmentSessionId, count + 1);
      }

      // Log session and response details for debugging
      logger.dev(
        `[getAggregated] Questionnaire ${input.questionnaireId} (user ${ctx.user.id}):`,
        {
          totalSessions: userSessions.length,
          sessions: userSessions.map((s) => ({
            id: s.id.slice(0, 8),
            completedAt: s.completedAt,
            responseCount: responsesBySession.get(s.id) ?? 0,
          })),
          totalResponses: userResponses.length,
          sessionsWithResponses: responsesBySession.size,
          sessionsWithoutResponses:
            userSessions.length - responsesBySession.size,
        },
      );

      return {
        totalSessions: userSessions.length,
        questionnaireId: input.questionnaireId,
        sessions: userSessions,
        responses: userResponses,
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
