"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/providers/TRPCProvider";
import { useTestAnalysisMutations } from "@/hooks/useTestAnalysisMutations";
import { buildResponsesPayload } from "@/lib/utils/questionnaire-responses";
import type { QuestionnaireItem } from "@/lib/types/questionnaire-responses";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface UseTestCompletionOptions {
  sessionId: string;
  slug: string;
  sessionData: {
    items: QuestionnaireItem[];
  };
  responses: Record<string, string | number | boolean | string[]>;
  flushDebounced: () => void;
}

interface UseTestCompletionReturn {
  handleComplete: () => Promise<void>;
  isCompleting: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Custom hook for handling test completion with batch save and retry logic
 *
 * Handles:
 * - Flushing pending debounced saves
 * - Batch saving all responses
 * - Completing the session
 * - Error handling with retry mechanism
 * - User feedback via toast notifications
 */
export function useTestCompletion({
  sessionId,
  slug,
  sessionData,
  responses,
  flushDebounced,
}: UseTestCompletionOptions): UseTestCompletionReturn {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const saveResponsesBatch =
    api.questionnaires.saveResponsesBatch.useMutation();
  const { completeSession } = useTestAnalysisMutations(slug);

  // Use ref for items to avoid dependency on array reference
  const itemsRef = useRef(sessionData.items);
  itemsRef.current = sessionData.items;

  // Use ref for responses to avoid dependency on object reference
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    setError(null);

    try {
      // 1) Flush any pending debounced saves (best effort)
      flushDebounced();

      // 2) Build batch payload from local responses
      const responsesPayload = buildResponsesPayload(
        itemsRef.current,
        responsesRef.current,
      );

      // Log payload before batch save
      logger.dev("[BATCH_SAVE] Payload prepared:", {
        sessionId,
        responseCount: responsesPayload.length,
        questionIds: responsesPayload.map((r) => r.questionId).slice(0, 5), // Sample first 5
        allQuestionIds: responsesPayload.map((r) => r.questionId),
      });

      // Early return if no responses to save
      if (responsesPayload.length === 0) {
        logger.dev("[BATCH_SAVE] No responses to save, early return");
        toast.info("No responses to save", {
          description: "Please answer at least one question before completing.",
        });
        setIsCompleting(false);
        return;
      }

      // 3) Save all responses in one go (with retry)
      let batchSaveSuccess = false;
      let currentRetry = 0;

      while (!batchSaveSuccess && currentRetry <= MAX_RETRIES) {
        try {
          logger.dev(
            `[BATCH_SAVE] Attempt ${currentRetry + 1}/${MAX_RETRIES + 1} - Calling mutation`,
            { sessionId, responseCount: responsesPayload.length },
          );

          const result = await saveResponsesBatch.mutateAsync({
            sessionId,
            responses: responsesPayload,
          });

          logger.dev("[BATCH_SAVE] Mutation result:", {
            success: result.success,
            savedCount: result.savedCount,
            failed: result.failed,
            failedCount: result.failed?.length ?? 0,
          });

          if (!result.success) {
            const failedCount = result.failed?.length ?? 0;
            logger.error("[BATCH_SAVE] Batch save failed:", {
              failedCount,
              failed: result.failed,
            });
            throw new Error(
              failedCount > 0
                ? `Failed to save ${failedCount} response(s)`
                : "Failed to save responses",
            );
          }

          logger.dev("[BATCH_SAVE] Batch save successful:", {
            savedCount: result.savedCount,
            expectedCount: responsesPayload.length,
          });

          batchSaveSuccess = true;
          setRetryCount(0);
        } catch (batchError: unknown) {
          currentRetry++;
          setRetryCount(currentRetry);

          if (currentRetry > MAX_RETRIES) {
            const errorMessage =
              batchError instanceof Error
                ? batchError.message
                : "Failed to save responses after multiple attempts";
            const error =
              batchError instanceof Error
                ? batchError
                : new Error(errorMessage);
            toast.error("Save Failed", {
              description: `${errorMessage}. Please try again.`,
              action: {
                label: "Retry",
                onClick: () => {
                  void handleComplete();
                },
              },
            });
            setError(error);
            setIsCompleting(false);
            return;
          }

          // Exponential backoff
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, currentRetry - 1);
          await sleep(delay);

          // Show retry notification only on first retry attempt
          if (currentRetry === 1) {
            toast.info("Retrying save...", {
              description: `Attempt ${currentRetry + 1} of ${MAX_RETRIES + 1}`,
            });
          } else {
            // Log subsequent retries using logger instead of showing toast
            logger.dev(
              `Retrying save... Attempt ${currentRetry + 1} of ${MAX_RETRIES + 1}`,
            );
          }
        }
      }

      // 4) Mark session as completed
      logger.dev("[SESSION_COMPLETE] Starting session completion", {
        sessionId,
      });

      const completionResult = await completeSession.mutateAsync({ sessionId });

      logger.dev("[SESSION_COMPLETE] Session completed successfully:", {
        sessionId,
        result: completionResult,
      });

      logger.dev("[NAVIGATION] Navigating to analysis page", {
        slug,
        timestamp: new Date().toISOString(),
      });

      router.push(`/tests/${slug}`);
    } catch (error) {
      logger.error("Failed to complete session:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.";
      toast.error("Completion Failed", {
        description: errorMessage,
      });
      setError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsCompleting(false);
    }
  }, [
    sessionId,
    slug,
    flushDebounced,
    saveResponsesBatch,
    completeSession,
    router,
  ]);

  return {
    handleComplete,
    isCompleting,
    error,
    retryCount,
  };
}
