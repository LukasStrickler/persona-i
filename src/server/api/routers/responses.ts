import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { assessmentSession } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import * as responseQueries from "@/server/db/queries/responses";

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
      return responseQueries.getResponsesBySession(ctx.db, input.sessionId);
    }),

  /**
   * Get aggregated responses for analysis pages (protected)
   */
  getAggregated: protectedProcedure
    .input(
      z.object({
        questionnaireId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return responseQueries.getAggregatedResponses(
        ctx.db,
        input.questionnaireId,
        ctx.user.id,
      );
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
      return responseQueries.getModelResponses(ctx.db, input.questionnaireId);
    }),
});
