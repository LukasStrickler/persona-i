"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/providers/TRPCProvider";
import { createTestAnalysisStore } from "@/stores/useTestAnalysisStore";
import { useUserSessionSync } from "./useUserSessionSync";
import type { ResponseValueType } from "@/lib/utils/response-value";
import { createLogger } from "@/lib/logger";

const cacheLogger = createLogger({ prefix: "Cache" });

interface UseTestAnalysisDataReturn {
  isLoading: boolean;
  isError: boolean;
  isHydrated: boolean;
  isFetchingInBackground: boolean;
  store: ReturnType<ReturnType<typeof createTestAnalysisStore>["getState"]>;
  syncStatus: {
    isSyncing: boolean;
    lastSyncTime: number | null;
    errors: Map<string, { count: number; lastError: Date }>;
  };
}

interface InitialData {
  questionnaire?: {
    id: string;
    slug: string;
    title: string;
    version: number;
    versionId: string;
  };
}

export function useTestAnalysisData(
  questionnaireSlug: string,
  initialData?: InitialData,
): UseTestAnalysisDataReturn {
  const utils = api.useUtils();

  // Get per-slug store instance
  const store = createTestAnalysisStore(questionnaireSlug);
  const storeState = store.getState();

  // Track hydration state
  const [isHydrated, setIsHydrated] = useState(() =>
    store.persist.hasHydrated(),
  );

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      const unsubscribe = store.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return unsubscribe;
    }
  }, [store]);

  const loadQuestionnaireContent = store.getState().loadQuestionnaireContent;
  const loadModelData = store.getState().loadModelData;
  const loadUserData = store.getState().loadUserData;
  const invalidateAll = store.getState().invalidateAll;
  const cacheMeta = storeState.cacheMeta;

  // Subscribe to reactive sync state values (not snapshots)
  const _syncInProgress = store((state) => state._syncInProgress);
  const _performanceMetrics = store((state) => state._performanceMetrics);
  const _syncErrors = store((state) => state._syncErrors);

  // Helper: Check if we have valid cache synchronously (before hydration completes)
  // This allows immediate rendering with cached data
  function hasValidCacheSync() {
    const currentState = store.getState();
    const hasQuestionnaire =
      currentState.meta !== null &&
      currentState.questions.size > 0 &&
      currentState.cacheMeta !== null;

    if (!hasQuestionnaire) return false;

    const currentCacheMeta = currentState.cacheMeta;
    if (!currentCacheMeta) return false;

    // Check version/versionId from initialData (SSR) or store meta
    const serverVersion = initialData?.questionnaire?.version;
    const serverVersionId = initialData?.questionnaire?.versionId;
    const storeVersion = currentState.meta?.version;
    const storeVersionId = currentState.meta?.versionId;

    // Cache is valid only if questionnaireId, version, and versionId all match
    const versionMatches =
      currentCacheMeta.questionnaireId ===
        (initialData?.questionnaire?.id ?? currentState.meta?.id) &&
      // Version check: if we have server data, compare against it; otherwise use store version
      (serverVersion !== undefined && serverVersionId !== undefined
        ? currentCacheMeta.version === serverVersion &&
          currentCacheMeta.versionId === serverVersionId
        : // If no server data yet, cache is valid if store has consistent version
          currentCacheMeta.version === storeVersion &&
          currentCacheMeta.versionId === storeVersionId);

    return versionMatches;
  }

  const hasZustandQuestionnaire =
    storeState.meta !== null &&
    storeState.questions.size > 0 &&
    storeState.cacheMeta !== null;

  // Check version/versionId from initialData (SSR) or store meta
  const serverVersion = initialData?.questionnaire?.version;
  const serverVersionId = initialData?.questionnaire?.versionId;
  const storeVersion = storeState.meta?.version;
  const storeVersionId = storeState.meta?.versionId;

  // Cache is valid only if questionnaireId, version, and versionId all match
  const hasValidZustandCache =
    hasZustandQuestionnaire &&
    cacheMeta &&
    cacheMeta.questionnaireId ===
      (initialData?.questionnaire?.id ?? storeState.meta?.id) &&
    // Version check: if we have server data, compare against it; otherwise use store version
    (serverVersion !== undefined && serverVersionId !== undefined
      ? cacheMeta.version === serverVersion &&
        cacheMeta.versionId === serverVersionId
      : // If no server data yet, cache is valid if store has consistent version
        cacheMeta.version === storeVersion &&
        cacheMeta.versionId === storeVersionId);

  const reactQueryQuestionnaireCache = utils.questionnaires.getBySlug.getData({
    slug: questionnaireSlug,
  });

  if (hasValidZustandCache) {
    cacheLogger.dev(`[Questionnaire] Zustand CACHE HIT: ${questionnaireSlug}`);
  } else if (reactQueryQuestionnaireCache) {
    cacheLogger.dev(
      `[Questionnaire] React Query CACHE HIT: ${questionnaireSlug}`,
    );
  } else {
    cacheLogger.dev(
      `[Questionnaire] CACHE MISS: ${questionnaireSlug} - will fetch`,
    );
  }

  // Allow queries to start if cache exists (even before hydration) or if hydrated
  const shouldQueryQuestionnaire =
    (hasValidCacheSync() || isHydrated) &&
    !hasValidZustandCache &&
    !reactQueryQuestionnaireCache;

  const questionnaireQuery = api.questionnaires.getBySlug.useQuery(
    { slug: questionnaireSlug },
    {
      enabled: shouldQueryQuestionnaire,
      staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  );

  const questionnaireData =
    hasValidZustandCache && storeState.meta
      ? {
          id: storeState.meta.id,
          slug: questionnaireSlug,
          title: storeState.meta.title,
          description: null,
          isPublic: true,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: {
            id: storeState.meta.versionId,
            version: storeState.meta.version,
            questionnaireId: storeState.meta.id,
            isActive: true,
            publishedAt: null,
            metadataJson: null,
            createdAt: new Date(),
          },
          items: store
            .getState()
            .getQuestionsByPosition()
            .map((q) => ({
              id: `item-${q.id}`,
              questionnaireVersionId: storeState.meta!.versionId,
              questionId: q.id,
              position: q.position,
              section: q.section,
              isRequired: true,
              createdAt: new Date(),
              question: {
                id: q.id,
                code: q.code,
                prompt: q.prompt,
                questionTypeCode: q.questionTypeCode,
                configJson: q.configJson,
                createdAt: new Date(),
                updatedAt: new Date(),
                options: (q.options ?? []).map((opt) => ({
                  id: opt.id,
                  questionId: q.id,
                  label: opt.label,
                  value: opt.value,
                  position: opt.position,
                  createdAt: new Date(),
                })),
              },
            })),
        }
      : (reactQueryQuestionnaireCache ?? questionnaireQuery.data);

  const versionData = questionnaireData?.version;

  const hasModelsLoaded =
    storeState.modelProfiles.size > 0 &&
    storeState.modelSessions.size > 0 &&
    (storeState.cacheMeta?.modelsFetchedAt ?? 0) > 0 &&
    storeState.cacheMeta?.questionnaireId ===
      (questionnaireData?.id ?? cacheMeta?.questionnaireId) &&
    // Also check version to ensure models match current questionnaire version
    storeState.cacheMeta?.version === versionData?.version &&
    storeState.cacheMeta?.versionId === versionData?.id;

  const reactQueryModelCache = questionnaireData?.id
    ? utils.responses.getModelResponses.getData({
        questionnaireId: questionnaireData.id,
      })
    : undefined;

  if (hasModelsLoaded) {
    cacheLogger.dev(
      `[Models] Zustand CACHE HIT: questionnaireId=${questionnaireData?.id}`,
      {
        modelsCount: storeState.modelProfiles.size,
        responsesCount: storeState.modelSessions.size,
      },
    );
  } else if (reactQueryModelCache) {
    cacheLogger.dev(
      `[Models] React Query CACHE HIT: questionnaireId=${questionnaireData?.id}`,
      {
        modelsCount: reactQueryModelCache.models?.length ?? 0,
        responsesCount: reactQueryModelCache.responses?.length ?? 0,
      },
    );
  } else {
    cacheLogger.dev(
      `[Models] CACHE MISS: questionnaireId=${questionnaireData?.id} - will fetch`,
      {
        hasQuestionnaireData: !!questionnaireData?.id,
        hasZustandModels: storeState.modelProfiles.size > 0,
        hasReactQueryCache: !!reactQueryModelCache,
      },
    );
  }

  // Allow model fetch if cache exists (even before hydration) or if hydrated
  const shouldFetchModels =
    (hasValidCacheSync() || isHydrated) &&
    !!questionnaireData?.id &&
    !hasModelsLoaded &&
    !reactQueryModelCache &&
    (!cacheMeta ||
      (cacheMeta.questionnaireId === questionnaireData.id &&
        cacheMeta.version === versionData?.version &&
        cacheMeta.versionId === versionData?.id));

  if (shouldFetchModels && questionnaireData?.id) {
    cacheLogger.dev(
      `[Models] FETCH ENABLED: questionnaireId=${questionnaireData.id}`,
      {
        hasZustandModels: hasModelsLoaded,
        hasReactQueryCache: !!reactQueryModelCache,
        cacheMeta: cacheMeta
          ? {
              questionnaireId: cacheMeta.questionnaireId,
              version: cacheMeta.version,
              modelsFetchedAt: cacheMeta.modelsFetchedAt,
            }
          : null,
      },
    );
  }

  const modelDataQuery = api.responses.getModelResponses.useQuery(
    { questionnaireId: questionnaireData?.id ?? "" },
    {
      enabled: shouldFetchModels && !!questionnaireData?.id,
      staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days - models rarely change
      gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
      // Prevent refetch on mount, window focus, or reconnect if we have data
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const modelData = hasModelsLoaded
    ? undefined
    : (reactQueryModelCache ?? modelDataQuery.data);

  const hasZustandUserData = storeState.userSessions.size > 0;

  const reactQueryUserCache = questionnaireData?.id
    ? utils.responses.getAggregated.getData({
        questionnaireId: questionnaireData.id,
      })
    : undefined;

  // Allow user data fetch if cache exists (even before hydration) or if hydrated
  const shouldFetchUserData =
    (hasValidCacheSync() || isHydrated) &&
    !!questionnaireData?.id &&
    !hasZustandUserData &&
    !reactQueryUserCache;

  const userDataQuery = api.responses.getAggregated.useQuery(
    { questionnaireId: questionnaireData?.id ?? "" },
    {
      enabled: shouldFetchUserData && !!questionnaireData?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes - user data changes more often
      gcTime: 30 * 60 * 1000, // 30 minutes
    },
  );

  const userData = reactQueryUserCache ?? userDataQuery.data;

  useEffect(() => {
    if (!questionnaireData || !versionData) return;

    const currentState = store.getState();
    const currentCache = currentState.cacheMeta;

    if (
      currentCache?.questionnaireId === questionnaireData.id &&
      currentCache.version === versionData.version &&
      currentCache.versionId === versionData.id &&
      currentState.questions.size > 0
    ) {
      return;
    }

    if (
      currentCache?.questionnaireId === questionnaireData.id &&
      (currentCache.version !== versionData.version ||
        currentCache.versionId !== versionData.id)
    ) {
      invalidateAll();

      void utils.questionnaires.getBySlug.invalidate({
        slug: questionnaireSlug,
      });
      void utils.responses.getModelResponses.invalidate({
        questionnaireId: questionnaireData.id,
      });
      void utils.responses.getAggregated.invalidate({
        questionnaireId: questionnaireData.id,
      });
    }

    loadQuestionnaireContent({
      meta: {
        id: questionnaireData.id,
        slug: questionnaireData.slug,
        title: questionnaireData.title,
        version: versionData.version,
        versionId: versionData.id,
      },
      questions: questionnaireData.items.map((item) => ({
        id: item.question.id,
        code: item.question.code || "",
        prompt: item.question.prompt,
        questionTypeCode: item.question.questionTypeCode,
        configJson: item.question.configJson,
        section: item.section,
        position: item.position,
        options: item.question.options || [],
      })),
    });

    store.setState({
      cacheMeta: {
        questionnaireId: questionnaireData.id,
        version: versionData.version,
        versionId: versionData.id,
        lastAccessedAt: Date.now(),
        modelsFetchedAt: currentCache?.modelsFetchedAt ?? 0, // Set to 0 if not loaded yet, so shouldFetchModels stays true
        userSessionsLastCheckedAt:
          currentCache?.userSessionsLastCheckedAt ?? null,
      },
    });
  }, [questionnaireData?.id, versionData?.version, versionData?.id]);

  // Load model data (only if needed)
  useEffect(() => {
    // Need data to load
    if (!modelData) {
      return;
    }

    const currentState = store.getState();

    // Ensure questions are loaded before processing model data
    if (currentState.questions.size === 0) {
      return;
    }

    // Check if we've already loaded models for this questionnaire
    // Only skip if models are actually loaded (not just cache metadata exists)
    if (
      currentState.cacheMeta &&
      currentState.cacheMeta.modelsFetchedAt > 0 && // Only skip if actually loaded (not 0)
      currentState.modelProfiles.size > 0 &&
      currentState.cacheMeta.questionnaireId === questionnaireData?.id
    ) {
      return;
    }

    const llmModels: Array<{
      id: string;
      displayName: string;
      subjectType: "llm";
      metadataJson?: unknown;
    }> = modelData.models
      .filter((m) => m.subjectType === "llm")
      .map((m) => ({
        id: m.id,
        displayName: m.displayName,
        subjectType: "llm" as const,
        metadataJson: m.metadataJson,
      }));

    loadModelData({
      models: llmModels,
      sessions: modelData.sessions ?? [],
      responses: modelData.responses.map((r) => ({
        id: r.id,
        assessmentSessionId: r.assessmentSessionId,
        questionId: r.questionId,
        valueType: r.valueType as ResponseValueType | null,
        valueNumeric: r.valueNumeric,
        valueBoolean: r.valueBoolean,
        valueText: r.valueText,
        selectedOptionId: r.selectedOptionId,
        rawPayloadJson: r.rawPayloadJson,
      })),
    });

    // Apply defaults if data loads after hydration and selection is empty
    // This handles the edge case where data loads after hydration completes
    const stateAfterLoad = store.getState();
    if (
      isHydrated &&
      stateAfterLoad.modelProfiles.size > 0 &&
      stateAfterLoad.selection.selectedModelIds.size === 0
    ) {
      store.getState().setModelSelection([]);
    }
  }, [
    modelData?.models?.length,
    modelData?.responses?.length,
    questionnaireData?.id,
    isHydrated,
  ]);

  useEffect(() => {
    // Need data to load (same pattern as model data)
    if (!userData) {
      return;
    }

    const currentState = store.getState();

    // Ensure questions are loaded before processing user data (same as model data)
    if (currentState.questions.size === 0) {
      cacheLogger.dev(
        `[User Sessions] WAITING: Questions not loaded yet, deferring user data processing`,
      );
      return;
    }

    // Use sessions directly from API response, not derived from responses
    const apiSessions = userData.sessions ?? [];
    const sessionIds = new Set(apiSessions.map((s) => s.id));

    // Check if we've already loaded these sessions
    const allSessionsLoaded = Array.from(sessionIds).every((id) =>
      currentState.userSessions.has(id),
    );

    if (allSessionsLoaded && sessionIds.size > 0) {
      cacheLogger.dev(
        `[User Sessions] SKIP: All ${sessionIds.size} sessions already loaded`,
      );
      return;
    }

    // Log session details for debugging
    const responsesBySession = new Map<string, number>();
    for (const response of userData.responses) {
      const count = responsesBySession.get(response.assessmentSessionId) ?? 0;
      responsesBySession.set(response.assessmentSessionId, count + 1);
    }

    cacheLogger.dev(
      `[User Sessions] LOADING: ${apiSessions.length} sessions, ${userData.responses.length} responses`,
      {
        sessions: apiSessions.map((s) => ({
          id: s.id.slice(0, 8),
          completedAt: s.completedAt,
          responseCount: responsesBySession.get(s.id) ?? 0,
        })),
        totalResponses: userData.responses.length,
        sessionsWithResponses: responsesBySession.size,
        sessionsWithoutResponses: apiSessions.length - responsesBySession.size,
      },
    );

    // Map sessions with proper date handling
    const sessions = apiSessions.map((s) => ({
      id: s.id,
      completedAt: s.completedAt
        ? s.completedAt instanceof Date
          ? s.completedAt
          : new Date(s.completedAt)
        : null,
    }));

    loadUserData({
      sessions,
      responses: userData.responses.map((r) => ({
        id: r.id,
        assessmentSessionId: r.assessmentSessionId,
        questionId: r.questionId,
        valueType: r.valueType as ResponseValueType | null,
        valueNumeric: r.valueNumeric,
        valueBoolean: r.valueBoolean,
        valueText: r.valueText,
        selectedOptionId: r.selectedOptionId,
        rawPayloadJson: r.rawPayloadJson,
      })),
    });

    // Apply defaults if data loads after hydration and selection is empty
    // This handles the edge case where data loads after hydration completes
    const stateAfterLoad = store.getState();

    // Log after loading
    cacheLogger.dev(
      `[User Sessions] LOADED: ${stateAfterLoad.userSessions.size} sessions in store`,
      {
        sessionIds: Array.from(stateAfterLoad.userSessions.keys()).map((id) =>
          id.slice(0, 8),
        ),
        responsesPerSession: Array.from(
          stateAfterLoad.userSessions.values(),
        ).map((s) => ({
          sessionId: s.sessionId.slice(0, 8),
          responseCount: s.responses.size,
        })),
      },
    );
    if (
      isHydrated &&
      stateAfterLoad.userSessions.size > 0 &&
      stateAfterLoad.selection.selectedUserSessionIds.size === 0
    ) {
      store.getState().setUserSessionSelection([]);
    }
  }, [shouldFetchUserData, userData?.responses?.length, isHydrated]);

  // Subscribe to userSessions size to get reactive updates
  const userSessionsSize = store((state) => state.userSessions.size);
  const hasUserSessionsLoaded = userSessionsSize > 0;
  const shouldSyncUserSessions =
    !!questionnaireData?.id && hasUserSessionsLoaded;

  if (shouldSyncUserSessions) {
    cacheLogger.dev(
      `[User Sessions] SYNC ENABLED: questionnaireId=${questionnaireData.id}`,
      {
        existingSessionsCount: userSessionsSize,
      },
    );
  } else if (questionnaireData?.id && !hasUserSessionsLoaded) {
    cacheLogger.dev(
      `[User Sessions] SYNC DISABLED: No sessions loaded yet - will fetch via getAggregated first`,
    );
  }

  useUserSessionSync({
    questionnaireId: questionnaireData?.id ?? null,
    enabled: shouldSyncUserSessions,
    checkInterval: 60000,
    slug: questionnaireSlug,
  });

  useEffect(() => {
    if (!store.persist.hasHydrated()) {
      const unsubscribe = store.persist.onFinishHydration(() => {
        applyDefaultsAfterRehydration();
      });
      return unsubscribe;
    } else {
      applyDefaultsAfterRehydration();
    }
  }, [store, questionnaireSlug]);

  function applyDefaultsAfterRehydration() {
    const currentState = store.getState();
    const setModelSelection = store.getState().setModelSelection;
    const setUserSessionSelection = store.getState().setUserSessionSelection;

    // Always reset to defaults after refresh/initial open (hydration)
    // This ensures consistent behavior: all models selected, latest session selected

    // Reset models: select all models (default)
    if (currentState.modelProfiles.size > 0) {
      // Pass empty array to trigger "select all" behavior in setModelSelection
      setModelSelection([]);
    }

    // Reset user sessions: select latest completed session (default)
    if (currentState.userSessions.size > 0) {
      // Pass empty array to trigger "select latest" behavior in setUserSessionSelection
      setUserSessionSelection([]);
    }
  }

  // Check if we have complete cache (synchronously or after hydration)
  const hasCompleteZustandCache =
    (hasValidCacheSync() || isHydrated) &&
    hasValidZustandCache &&
    (hasModelsLoaded || !questionnaireData?.id) &&
    (hasZustandUserData || !questionnaireData?.id);

  const isFetchingInBackground = Boolean(
    hasCompleteZustandCache &&
    (questionnaireQuery.isFetching ||
      modelDataQuery.isFetching ||
      userDataQuery.isFetching),
  );

  // Only show loading if:
  // 1. No valid cache exists (synchronously checkable) AND
  // 2. Not hydrated yet AND
  // 3. Actually fetching data
  const isLoading =
    !hasValidCacheSync() && !isHydrated
      ? true // Block only if no cache AND not hydrated
      : hasCompleteZustandCache
        ? false // Have complete cache, never loading
        : questionnaireQuery.isLoading ||
          (shouldFetchModels && modelDataQuery.isLoading) ||
          (shouldFetchUserData && userDataQuery.isLoading);

  const isError: boolean =
    (!hasValidCacheSync() && !isHydrated) || hasCompleteZustandCache
      ? false
      : !!(
          questionnaireQuery.isError ||
          modelDataQuery.isError ||
          userDataQuery.isError
        );

  return {
    isLoading,
    isError,
    isHydrated,
    isFetchingInBackground,
    store: store.getState(),
    syncStatus: {
      isSyncing: _syncInProgress,
      lastSyncTime: _performanceMetrics.lastSyncTime,
      errors: _syncErrors,
    },
  };
}
