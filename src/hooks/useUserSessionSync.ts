"use client";

import { useEffect, useRef } from "react";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";

interface UseUserSessionSyncOptions {
  questionnaireId: string | null;
  enabled?: boolean;
  checkInterval?: number; // ms, default 60 seconds
  onNewSession?: (sessionId: string) => void;
  slug: string; // Required for per-slug store
}

/**
 * Hook for periodic checking of new user sessions
 * Delegates to store's syncUserSessions which handles mutex/queue/backoff
 * Used internally by useTestAnalysisData for background syncing
 */
export function useUserSessionSync({
  questionnaireId,
  enabled = true,
  checkInterval = 60000,
  onNewSession,
  slug,
}: UseUserSessionSyncOptions) {
  // Get per-slug store instance
  const store = createTestAnalysisStore(slug);
  const syncUserSessions = store.getState().syncUserSessions;
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousSessionCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !questionnaireId) return;

    // Track session count for onNewSession callback
    // Handle both growth and shrink/reset cases to ensure new sessions are detected correctly
    const updateSessionCount = () => {
      const currentState = store.getState();
      const currentCount = currentState.userSessions.size;
      const previousCount = previousSessionCountRef.current;

      // Always update the ref, even if count decreased (handles resets)
      if (currentCount !== previousCount) {
        if (currentCount > previousCount && onNewSession) {
          // Count increased - find new sessions
          const allIds = Array.from(currentState.userSessions.keys());
          const newSessions = allIds.slice(previousCount);

          for (const sessionId of newSessions) {
            onNewSession(sessionId);
          }
        }
        // Update ref for both growth and shrink cases
        previousSessionCountRef.current = currentCount;
      }
    };

    // Initial sync
    const performSync = async () => {
      try {
        await syncUserSessions(questionnaireId);
        updateSessionCount();
      } catch (error) {
        console.error("Failed to sync user sessions:", error);
      }
    };

    // Perform initial sync
    void performSync();

    // Then sync periodically
    intervalRef.current = setInterval(() => {
      void performSync();
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    questionnaireId,
    enabled,
    checkInterval,
    syncUserSessions,
    onNewSession,
    slug,
    store,
  ]);
}
