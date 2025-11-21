"use client";

import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/providers/TRPCProvider";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";
import { logger } from "@/lib/logger";

/**
 * Hook for handling test analysis mutations
 * Primarily handles session completion with incremental updates
 */
export function useTestAnalysisMutations(slug: string) {
  const queryClient = useQueryClient();
  // Get per-slug store instance
  const store = createTestAnalysisStore(slug);
  const fetchAndAddUserSessions = store.getState().fetchAndAddUserSessions;
  const syncUserSessions = store.getState().syncUserSessions;

  const completeSession = api.questionnaires.completeSession.useMutation({
    onSuccess: async (data, variables) => {
      logger.dev("[STORE_SYNC] Session completion success, fetching session:", {
        sessionId: variables.sessionId,
        result: data,
      });

      // Immediately fetch the completed session and add to store
      // This is the ONLY refetch needed - models stay cached
      try {
        logger.dev("[STORE_SYNC] Calling fetchAndAddUserSessions", {
          sessionId: variables.sessionId,
        });

        const fetchResult = await fetchAndAddUserSessions([
          variables.sessionId,
        ]);

        logger.dev("[STORE_SYNC] fetchAndAddUserSessions result:", {
          sessionId: variables.sessionId,
          result: fetchResult,
        });

        // Also trigger a sync to catch any edge cases
        const meta = store.getState().meta;
        if (meta) {
          logger.dev("[STORE_SYNC] Triggering background sync", {
            questionnaireId: meta.id,
          });
          // Sync in background (don't await)
          void syncUserSessions(meta.id)
            .then((syncResult) => {
              logger.dev("[STORE_SYNC] Background sync completed:", {
                questionnaireId: meta.id,
                result: syncResult,
              });
            })
            .catch((error) => {
              logger.error("[STORE_SYNC] Background sync failed:", error);
            });
        } else {
          logger.dev("[STORE_SYNC] No meta found, skipping background sync");
        }
      } catch (error) {
        logger.error("[STORE_SYNC] Failed to fetch completed session:", {
          sessionId: variables.sessionId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Fallback: trigger sync which will pick it up
        const meta = store.getState().meta;
        if (meta) {
          logger.dev("[STORE_SYNC] Fallback: triggering sync", {
            questionnaireId: meta.id,
          });
          void syncUserSessions(meta.id).catch((syncError) => {
            logger.error("[STORE_SYNC] Fallback sync failed:", syncError);
          });
        }
      }

      // Invalidate React Query cache (for other components that might use it)
      void queryClient.invalidateQueries({
        queryKey: [["responses", "getAggregated"]],
      });
    },
    onError: (error) => {
      logger.error("Failed to complete session:", error);
      // Could show user feedback here
    },
  });

  return { completeSession };
}
