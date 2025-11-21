import { create } from "zustand";
import {
  persist,
  subscribeWithSelector,
  type PersistStorage,
} from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet, type WritableDraft } from "immer";
import {
  getResponseValue,
  type ResponseValueType,
} from "@/lib/utils/response-value";
import { createVanillaTRPCClient } from "@/lib/trpc-client";

// Enable Immer MapSet plugin for Maps and Sets support
enableMapSet();

// ============================================================================
// Type Definitions
// ============================================================================

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  position: number;
}

export interface Question {
  id: string;
  code: string;
  prompt: string;
  questionTypeCode: string;
  configJson: unknown;
  section: string | null;
  position: number;
  options?: QuestionOption[];
}

export interface ModelProfile {
  id: string;
  displayName: string;
  subjectType: "llm";
  metadataJson?: unknown;
}

export interface ProcessedResponse {
  questionId: string;
  value: string | number | boolean | string[] | null;
  valueType: ResponseValueType | null;
}

// Aligned with architecture: subjectId and subjectType instead of separate modelId/userId
export interface SessionResponses {
  sessionId: string;
  subjectId: string | null; // modelId or userId
  subjectType: "model" | "user";
  displayName: string;
  responses: Map<string, ProcessedResponse>;
  completedAt: Date | null;
}

export interface AnalysisModel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  configJson?: unknown;
}

export interface TraitDimension {
  id: string;
  code: string;
  name: string;
  colorHex: string | null;
  rangeMin: number;
  rangeMax: number;
}

export interface QuestionTraitMapping {
  id: string;
  questionId: string;
  optionId: string | null;
  dimensionId: string;
  ruleType: string;
  weight: number;
  configJson?: unknown;
}

// Aligned with architecture: CacheMeta with lastAccessedAt and userSessionsLastCheckedAt
export interface CacheMeta {
  questionnaireId: string;
  version: number;
  versionId: string;
  lastAccessedAt: number;
  modelsFetchedAt: number; // 0 means not loaded yet
  userSessionsLastCheckedAt: number | null;
}

export interface PerformanceMetrics {
  syncCount: number;
  syncDuration: number[];
  lastSyncTime: number | null;
}

export interface SyncError {
  count: number;
  lastError: Date;
}

// Aligned with architecture: SelectionState wrapper
export interface SelectionState {
  selectedModelIds: Set<string>;
  selectedUserSessionIds: Set<string>;
}

// Aligned with architecture: QuestionnaireMeta
export interface QuestionnaireMeta {
  id: string;
  slug: string;
  title: string;
  version: number;
  versionId: string;
}

// ============================================================================
// Store State Interface
// ============================================================================

export interface TestAnalysisState {
  // Core data - aligned with architecture
  meta: QuestionnaireMeta | null;

  questions: Map<string, Question>;

  // Model data
  modelProfiles: Map<string, ModelProfile>;
  modelSessions: Map<string, SessionResponses>;

  // User data
  userSessions: Map<string, SessionResponses>;

  // Selection state - wrapped in selection object (ephemeral, not persisted)
  selection: SelectionState;

  // Computed (filtered) - ephemeral, not persisted
  filteredModelResponses: SessionResponses[];
  filteredUserResponses: SessionResponses[];

  // Cache metadata - aligned with architecture
  cacheMeta: CacheMeta | null;

  // Sync state
  _syncInProgress: boolean;
  _syncQueue: string[];
  _syncErrors: Map<string, SyncError>;
  _isOnline: boolean;

  // Performance metrics
  _performanceMetrics: PerformanceMetrics;

  // Computed cache
  _computedCache: Map<string, unknown>;

  // Actions - aligned with architecture naming
  loadQuestionnaireContent: (data: {
    meta: QuestionnaireMeta;
    questions: Question[];
  }) => void;

  loadModelData: (data: {
    models: ModelProfile[];
    sessions: Array<{ id: string; subjectProfileId: string }>;
    responses: Array<{
      id: string;
      assessmentSessionId: string;
      questionId: string;
      valueType: ResponseValueType | null;
      valueNumeric?: number | null;
      valueBoolean?: boolean | null;
      valueText?: string | null;
      selectedOptionId?: string | null;
      rawPayloadJson?: unknown;
    }>;
  }) => void;

  loadUserData: (data: {
    sessions: Array<{ id: string; completedAt: Date | null }>;
    responses: Array<{
      id: string;
      assessmentSessionId: string;
      questionId: string;
      valueType: ResponseValueType | null;
      valueNumeric?: number | null;
      valueBoolean?: boolean | null;
      valueText?: string | null;
      selectedOptionId?: string | null;
      rawPayloadJson?: unknown;
    }>;
  }) => void;

  addUserSession: (session: SessionResponses) => void;

  checkForNewUserSessions: (questionnaireId: string) => Promise<string[]>;

  fetchAndAddUserSessions: (sessionIds: string[]) => Promise<void>;

  syncUserSessions: (questionnaireId: string) => Promise<void>;

  setModelSelection: (modelIds: string[]) => void;

  setUserSessionSelection: (sessionIds: string[]) => void;

  invalidateUserSessions: () => void;

  invalidateAll: () => void;

  // Getters
  getQuestion: (questionId: string) => Question | undefined;
  getQuestionsByPosition: () => Question[];
}

// ============================================================================
// Custom Storage Adapter with Map/Set Serialization
// ============================================================================

function createCustomStorage(
  slug: string,
): PersistStorage<Partial<TestAnalysisState>> {
  return {
    getItem: (name: string) => {
      if (typeof window === "undefined") return null;

      try {
        const raw = window.localStorage.getItem(name);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
          state: Partial<TestAnalysisState>;
          version?: number;
        };
        const { state } = parsed;

        // Rehydrate Maps/Sets from persisted arrays
        if (state.questions && Array.isArray(state.questions)) {
          state.questions = new Map(state.questions);
          // questionsByPosition is now computed on-demand, no need to store it
        }
        if (state.modelProfiles && Array.isArray(state.modelProfiles)) {
          state.modelProfiles = new Map(state.modelProfiles);
        }
        if (state.modelSessions && Array.isArray(state.modelSessions)) {
          state.modelSessions = new Map(state.modelSessions);
          // Rehydrate nested Maps in SessionResponses
          for (const [, session] of state.modelSessions.entries()) {
            if (session.responses && Array.isArray(session.responses)) {
              session.responses = new Map(session.responses);
            }
            // Convert completedAt from string/number back to Date
            if (session.completedAt) {
              session.completedAt =
                session.completedAt instanceof Date
                  ? session.completedAt
                  : new Date(session.completedAt);
            }
          }
        }
        if (state.userSessions && Array.isArray(state.userSessions)) {
          state.userSessions = new Map(state.userSessions);
          // Rehydrate nested Maps in SessionResponses
          for (const [, session] of state.userSessions.entries()) {
            if (session.responses && Array.isArray(session.responses)) {
              session.responses = new Map(session.responses);
            }
            // Convert completedAt from string/number back to Date
            if (session.completedAt) {
              session.completedAt =
                session.completedAt instanceof Date
                  ? session.completedAt
                  : new Date(session.completedAt);
            }
          }
        }

        // Always reset selection to empty Sets (ephemeral, not persisted)
        // Defaults will be applied after rehydration completes
        state.selection = {
          selectedModelIds: new Set(),
          selectedUserSessionIds: new Set(),
        };

        // CRITICAL: Rehydrate _computedCache and _syncErrors even though they're not persisted
        //
        // WHAT CAUSED THE ISSUE:
        // - These fields were removed as "dead code" because they're never persisted (see setItem)
        // - However, removing them caused "The result of getSnapshot should be cached" errors
        // - This led to infinite loops because Zustand's state structure became inconsistent
        //
        // WHY THIS CODE IS NEEDED:
        // 1. Handles old persisted state: Old localStorage data might have these fields as arrays
        //    - If we don't rehydrate them, they remain as arrays instead of Maps
        //    - This causes type mismatches and inconsistent state structure
        // 2. Maintains state structure: Zustand merges persisted state with initial state
        //    - If these fields are missing or wrong type, Zustand can't properly merge
        //    - This causes getSnapshot to return new objects on every read = infinite loops
        // 3. Zustand's merge behavior: When merging, Zustand expects consistent types
        //    - Missing fields or type mismatches cause state to be recreated on every read
        //    - This triggers "getSnapshot should be cached" warnings and infinite re-renders
        //
        // WHAT MUST BE KEPT:
        // - MUST rehydrate these fields if they exist in persisted state (as arrays)
        // - MUST convert them to Maps to match the expected state structure
        // - MUST NOT remove this code even though these fields aren't persisted
        // - MUST NOT always initialize them (let Zustand merge handle defaults from initial state)
        //
        // Rehydrate _computedCache (ephemeral, but rehydrate if present)
        if (state._computedCache && Array.isArray(state._computedCache)) {
          state._computedCache = new Map(
            state._computedCache as Array<[string, unknown]>,
          );
        }

        // Rehydrate _syncErrors (ephemeral, but rehydrate if present)
        if (state._syncErrors && Array.isArray(state._syncErrors)) {
          state._syncErrors = new Map(
            state._syncErrors as Array<[string, SyncError]>,
          );
        }

        // Return as StorageValue - Zustand will handle partial state during migration
        return { ...parsed, state: state as TestAnalysisState } as {
          state: TestAnalysisState;
          version?: number;
        };
      } catch (error) {
        // Corrupted cache – drop it
        console.warn(
          `[Store ${slug}] Corrupted cache detected, clearing:`,
          error,
        );
        window.localStorage.removeItem(name);
        return null;
      }
    },
    setItem: (
      name: string,
      value: { state: Partial<TestAnalysisState>; version?: number },
    ) => {
      if (typeof window === "undefined") return;

      try {
        const state = value.state;
        const serialized = JSON.stringify({
          ...value,
          state: {
            ...state,
            // Serialize Maps as arrays (only if they exist)
            questions: state.questions
              ? Array.from(state.questions.entries())
              : [],
            modelProfiles: state.modelProfiles
              ? Array.from(state.modelProfiles.entries())
              : [],
            modelSessions: state.modelSessions
              ? Array.from(state.modelSessions.entries()).map((entry) => {
                  const [k, v] = entry;
                  return [
                    k,
                    {
                      ...v,
                      responses: Array.from(v.responses.entries()),
                    },
                  ];
                })
              : [],
            userSessions: state.userSessions
              ? Array.from(state.userSessions.entries()).map((entry) => {
                  const [k, v] = entry;
                  return [
                    k,
                    {
                      ...v,
                      responses: Array.from(v.responses.entries()),
                    },
                  ];
                })
              : [],
            // Do NOT persist selection, filtered arrays, _computedCache, _performance, _syncInProgress
            // These are ephemeral and will be reinitialized on load
          },
        });
        window.localStorage.setItem(name, serialized);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "QuotaExceededError") {
          // Handle localStorage full
          console.warn(
            `[Store ${slug}] localStorage quota exceeded, attempting cleanup`,
          );
          // Could implement LRU cleanup here if needed
          // For now, just log and continue without persistence
        } else if (e instanceof Error) {
          console.error(`[Store ${slug}] Failed to persist state:`, e);
        }
      }
    },
    removeItem: (name: string) => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
    },
  };
}

// ============================================================================
// Store Factory - Creates Per-Slug Store Instances
// ============================================================================

// Cache of store instances per slug
const storeInstances = new Map<string, ReturnType<typeof createStore>>();

export function createTestAnalysisStore(slug: string) {
  // Return existing store if already created
  if (storeInstances.has(slug)) {
    return storeInstances.get(slug)!;
  }

  // Create new store instance for this slug
  const store = createStore(slug);
  storeInstances.set(slug, store);
  return store;
}

function createStore(slug: string) {
  const storageKey = `test-analysis-${slug}`;
  const customStorage = createCustomStorage(slug);

  const store = create<TestAnalysisState>()(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial state
          meta: null,
          questions: new Map(),
          modelProfiles: new Map(),
          modelSessions: new Map(),
          userSessions: new Map(),
          selection: {
            selectedModelIds: new Set(),
            selectedUserSessionIds: new Set(),
          },
          filteredModelResponses: [],
          filteredUserResponses: [],
          cacheMeta: null,
          _syncInProgress: false,
          _syncQueue: [],
          _syncErrors: new Map(),
          _isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
          _performanceMetrics: {
            syncCount: 0,
            syncDuration: [],
            lastSyncTime: null,
          },
          _computedCache: new Map(),

          // Load questionnaire content - aligned with architecture naming
          loadQuestionnaireContent: (data) => {
            set((state) => {
              const questionsMap = new Map<string, Question>();

              for (const q of data.questions) {
                questionsMap.set(q.id, q);
              }

              state.meta = data.meta;
              state.questions = questionsMap;
              // questionsByPosition is now computed on-demand, no need to store it
              state._computedCache.clear();

              // Update lastAccessedAt
              if (state.cacheMeta) {
                state.cacheMeta.lastAccessedAt = Date.now();
              }
            });
          },

          // Load model data
          loadModelData: (data) => {
            set((state) => {
              const modelProfilesMap = new Map<string, ModelProfile>();
              const sessionsMap = new Map<string, SessionResponses>();

              // Create model profiles map
              for (const model of data.models) {
                modelProfilesMap.set(model.id, model);
              }

              // Create sessionId -> modelId mapping
              const sessionToModel = new Map<string, string>();
              for (const session of data.sessions) {
                sessionToModel.set(session.id, session.subjectProfileId);
              }

              // Group responses by session
              const responsesBySession = new Map<
                string,
                Array<(typeof data.responses)[0]>
              >();
              for (const response of data.responses) {
                if (!responsesBySession.has(response.assessmentSessionId)) {
                  responsesBySession.set(response.assessmentSessionId, []);
                }
                responsesBySession
                  .get(response.assessmentSessionId)!
                  .push(response);
              }

              // Process each session's responses
              for (const [
                sessionId,
                responses,
              ] of responsesBySession.entries()) {
                const modelId = sessionToModel.get(sessionId);
                const model = modelId
                  ? modelProfilesMap.get(modelId)
                  : undefined;

                const processedResponses = new Map<string, ProcessedResponse>();

                for (const response of responses) {
                  const question = state.questions.get(response.questionId);
                  if (!question) continue;

                  // Create option value map for option-type responses
                  const optionValueMap = question.options
                    ? new Map(
                        question.options.map((opt) => [opt.id, opt.value]),
                      )
                    : undefined;

                  const value = getResponseValue(
                    {
                      valueType: response.valueType,
                      valueNumeric: response.valueNumeric,
                      valueBoolean: response.valueBoolean,
                      valueText: response.valueText,
                      selectedOptionId: response.selectedOptionId,
                      rawPayloadJson: response.rawPayloadJson,
                    },
                    optionValueMap,
                  );

                  processedResponses.set(response.questionId, {
                    questionId: response.questionId,
                    value,
                    valueType: response.valueType,
                  });
                }

                // Use subjectId and subjectType instead of modelId/userId
                const sessionData: SessionResponses = {
                  sessionId,
                  subjectId: modelId ?? null,
                  subjectType: "model",
                  displayName: model?.displayName ?? "Unknown Model",
                  responses: processedResponses,
                  completedAt: null,
                };

                sessionsMap.set(sessionId, sessionData);
              }

              state.modelProfiles = modelProfilesMap;
              state.modelSessions = sessionsMap;
              // Don't set selection here - defaults will be applied after hydration
              // filteredModelResponses will be updated when selection is set
              state.filteredModelResponses = [];

              // Update cache metadata
              if (state.cacheMeta) {
                state.cacheMeta.modelsFetchedAt = Date.now();
                state.cacheMeta.lastAccessedAt = Date.now();
              }

              // Clear computed cache
              state._computedCache.clear();
            });
          },

          // Load user data
          loadUserData: (data) => {
            set((state) => {
              const sessionsMap = new Map<string, SessionResponses>();
              const sessionIds = new Set<string>();

              // Create sessionId -> completedAt mapping
              const sessionCompletedAt = new Map<string, Date | null>();
              for (const session of data.sessions) {
                sessionCompletedAt.set(session.id, session.completedAt);
              }

              // Group responses by session
              const responsesBySession = new Map<
                string,
                Array<(typeof data.responses)[0]>
              >();
              for (const response of data.responses) {
                if (!responsesBySession.has(response.assessmentSessionId)) {
                  responsesBySession.set(response.assessmentSessionId, []);
                }
                responsesBySession
                  .get(response.assessmentSessionId)!
                  .push(response);
              }

              // Process each session's responses
              for (const [
                sessionId,
                responses,
              ] of responsesBySession.entries()) {
                const processedResponses = new Map<string, ProcessedResponse>();
                const { questions } = get();

                for (const response of responses) {
                  const question = questions.get(response.questionId);
                  if (!question) continue;

                  const optionValueMap = question.options
                    ? new Map(
                        question.options.map((opt) => [opt.id, opt.value]),
                      )
                    : undefined;

                  const value = getResponseValue(
                    {
                      valueType: response.valueType,
                      valueNumeric: response.valueNumeric,
                      valueBoolean: response.valueBoolean,
                      valueText: response.valueText,
                      selectedOptionId: response.selectedOptionId,
                      rawPayloadJson: response.rawPayloadJson,
                    },
                    optionValueMap,
                  );

                  processedResponses.set(response.questionId, {
                    questionId: response.questionId,
                    value,
                    valueType: response.valueType,
                  });
                }

                // Use subjectId and subjectType instead of userId
                sessionsMap.set(sessionId, {
                  sessionId,
                  subjectId: null, // Will be set from session data if available
                  subjectType: "user",
                  displayName: `Session ${sessionId.slice(0, 8)}`,
                  responses: processedResponses,
                  completedAt: sessionCompletedAt.get(sessionId) ?? null,
                });

                sessionIds.add(sessionId);
              }

              state.userSessions = sessionsMap;
              // Don't set selection here - defaults will be applied after hydration
              // filteredUserResponses will be updated when selection is set
              state.filteredUserResponses = [];

              if (state.cacheMeta) {
                state.cacheMeta.userSessionsLastCheckedAt = Date.now();
                state.cacheMeta.lastAccessedAt = Date.now();
              }

              // Clear computed cache
              state._computedCache.clear();
            });
          },

          // Add single user session
          addUserSession: (session) => {
            set((state) => {
              state.userSessions.set(session.sessionId, session);
              const allUserResponses = Array.from(state.userSessions.values());

              // Auto-select the newest session (smart default)
              state.selection.selectedUserSessionIds = new Set([
                session.sessionId,
              ]);
              state.filteredUserResponses = allUserResponses.filter(
                (s) => s.sessionId === session.sessionId,
              );

              if (state.cacheMeta) {
                state.cacheMeta.userSessionsLastCheckedAt = Date.now();
                state.cacheMeta.lastAccessedAt = Date.now();
              }

              // Clear computed cache
              state._computedCache.clear();
            });
          },

          // Check for new user sessions (lightweight)
          checkForNewUserSessions: async (questionnaireId) => {
            try {
              const trpcClient = createVanillaTRPCClient();
              const result =
                await trpcClient.questionnaires.getUserSessionIds.query({
                  questionnaireId,
                });

              if (!result.sessions) {
                return [];
              }

              const serverSessionIds = new Set(
                result.sessions.map((s) => s.id),
              );
              const { userSessions } = get();

              // Return IDs we don't have
              const missingIds: string[] = [];
              for (const id of serverSessionIds) {
                if (typeof id === "string" && !userSessions.has(id)) {
                  missingIds.push(id);
                }
              }
              return missingIds;
            } catch (error) {
              console.error("Failed to check for new user sessions:", error);
              // Track error
              set((state) => {
                const errorInfo = state._syncErrors.get(questionnaireId) ?? {
                  count: 0,
                  lastError: new Date(),
                };
                errorInfo.count++;
                errorInfo.lastError = new Date();
                state._syncErrors.set(questionnaireId, errorInfo);
              });
              return [];
            }
          },

          // Fetch and add new user sessions
          fetchAndAddUserSessions: async (sessionIds) => {
            if (sessionIds.length === 0) return;

            const { questions } = get();
            const startTime = Date.now();

            try {
              const trpcClient = createVanillaTRPCClient();
              // Fetch sessions in parallel using typed tRPC client
              const sessions = await Promise.all(
                sessionIds.map(async (sessionId) => {
                  try {
                    return await trpcClient.questionnaires.getSession.query({
                      sessionId,
                    });
                  } catch (error) {
                    console.error(
                      `Failed to fetch session ${sessionId}:`,
                      error,
                    );
                    return null;
                  }
                }),
              );

              // Process and add each session
              for (const sessionData of sessions) {
                if (!sessionData) continue;

                const processedResponses = new Map<string, ProcessedResponse>();

                for (const item of sessionData.items || []) {
                  if (!item.response || !item.question) continue;

                  const question = questions.get(item.question.id);
                  if (!question) continue;

                  const optionValueMap = question.options
                    ? new Map(
                        question.options.map((opt) => [opt.id, opt.value]),
                      )
                    : undefined;

                  const value = getResponseValue(
                    {
                      valueType:
                        (item.response.valueType as ResponseValueType) || null,
                      valueNumeric: item.response.valueNumeric ?? null,
                      valueBoolean: item.response.valueBoolean ?? null,
                      valueText: item.response.valueText ?? null,
                      selectedOptionId: item.response.selectedOptionId ?? null,
                      rawPayloadJson: item.response.rawPayloadJson,
                    },
                    optionValueMap,
                  );

                  processedResponses.set(item.question.id, {
                    questionId: item.question.id,
                    value,
                    valueType:
                      (item.response.valueType as ResponseValueType) ?? null,
                  });
                }

                get().addUserSession({
                  sessionId: sessionData.session.id,
                  subjectId: sessionData.session.userId ?? null,
                  subjectType: "user",
                  displayName: `Session ${sessionData.session.id?.slice(0, 8) ?? "unknown"}`,
                  responses: processedResponses,
                  completedAt: sessionData.session.completedAt
                    ? new Date(sessionData.session.completedAt)
                    : null,
                });
              }

              // Update performance metrics
              const duration = Date.now() - startTime;
              set((state) => {
                state._performanceMetrics.syncCount++;
                state._performanceMetrics.syncDuration.push(duration);
                // Keep only last 100 durations
                if (state._performanceMetrics.syncDuration.length > 100) {
                  state._performanceMetrics.syncDuration.shift();
                }
                state._performanceMetrics.lastSyncTime = Date.now();
              });
            } catch (err) {
              console.error("Failed to fetch and add user sessions:", err);
              throw err;
            }
          },

          // Main sync with mutex/lock
          syncUserSessions: async (questionnaireId) => {
            const state = get();

            // Prevent concurrent syncs
            if (state._syncInProgress) {
              set((s) => {
                if (!s._syncQueue.includes(questionnaireId)) {
                  s._syncQueue.push(questionnaireId);
                }
              });
              return;
            }

            // Check if offline
            if (!state._isOnline) {
              set((s) => {
                if (!s._syncQueue.includes(questionnaireId)) {
                  s._syncQueue.push(questionnaireId);
                }
              });
              return;
            }

            set((s: WritableDraft<TestAnalysisState>) => {
              s._syncInProgress = true;
            });

            try {
              const newSessionIds =
                await get().checkForNewUserSessions(questionnaireId);
              if (newSessionIds.length > 0) {
                await get().fetchAndAddUserSessions(newSessionIds);
              }

              // Clear error on success
              set((s) => {
                s._syncErrors.delete(questionnaireId);
              });
            } catch (error) {
              const err =
                error instanceof Error ? error : new Error(String(error));
              console.error("syncUserSessions failed:", err);
              const errorInfo = get()._syncErrors.get(questionnaireId) ?? {
                count: 0,
                lastError: new Date(),
              };
              errorInfo.count++;
              errorInfo.lastError = new Date();

              set((s) => {
                s._syncErrors.set(questionnaireId, errorInfo);
              });

              // Exponential backoff retry
              if (errorInfo.count < 3) {
                const delay = Math.min(
                  1000 * Math.pow(2, errorInfo.count),
                  30000,
                );
                setTimeout(() => {
                  get().syncUserSessions(questionnaireId).catch(console.error);
                }, delay);
              } else {
                console.error(
                  `Failed to sync ${questionnaireId} after ${errorInfo.count} attempts`,
                );
              }
            } finally {
              set((s) => {
                s._syncInProgress = false;
                // Process queue
                const next = s._syncQueue.shift();
                if (next) {
                  // Recursively process queue
                  setTimeout(() => {
                    get().syncUserSessions(next).catch(console.error);
                  }, 100);
                }
              });
            }
          },

          // Selection actions - aligned with architecture naming
          setModelSelection: (modelIds) => {
            set((state) => {
              // If empty, fall back to all models (smart default)
              const effectiveIds =
                modelIds.length > 0
                  ? modelIds
                  : Array.from(state.modelProfiles.keys());

              state.selection.selectedModelIds = new Set(effectiveIds);
              state.filteredModelResponses = Array.from(
                state.modelSessions.values(),
              ).filter(
                (s) =>
                  s.subjectType === "model" &&
                  s.subjectId !== null &&
                  state.selection.selectedModelIds.has(s.subjectId),
              );
              state._computedCache.clear();
            });
          },

          setUserSessionSelection: (sessionIds) => {
            set((state) => {
              if (sessionIds.length === 0) {
                // Fallback to latest completed session (smart default)
                const allUserResponses = Array.from(
                  state.userSessions.values(),
                );

                if (allUserResponses.length === 0) {
                  // No sessions available
                  state.selection.selectedUserSessionIds = new Set();
                  state.filteredUserResponses = [];
                } else {
                  // Try to find latest completed session first
                  const latestCompleted = [...allUserResponses]
                    .filter((s) => s.completedAt)
                    .sort(
                      (a, b) =>
                        (b.completedAt?.getTime() ?? 0) -
                        (a.completedAt?.getTime() ?? 0),
                    )[0];

                  if (latestCompleted) {
                    state.selection.selectedUserSessionIds = new Set([
                      latestCompleted.sessionId,
                    ]);
                    state.filteredUserResponses = allUserResponses.filter(
                      (s) => s.sessionId === latestCompleted.sessionId,
                    );
                  } else {
                    // Fallback: select most recent session by insertion order
                    const mostRecent = allUserResponses[0];
                    if (mostRecent) {
                      state.selection.selectedUserSessionIds = new Set([
                        mostRecent.sessionId,
                      ]);
                      state.filteredUserResponses = [mostRecent];
                    } else {
                      // Should not happen, but defensive
                      state.selection.selectedUserSessionIds = new Set();
                      state.filteredUserResponses = [];
                    }
                  }
                }
              } else {
                state.selection.selectedUserSessionIds = new Set(sessionIds);
                state.filteredUserResponses = Array.from(
                  state.userSessions.values(),
                ).filter((s) =>
                  state.selection.selectedUserSessionIds.has(s.sessionId),
                );
              }

              state._computedCache.clear();
            });
          },

          // Invalidation
          invalidateUserSessions: () => {
            set((state) => {
              state.userSessions.clear();
              state.selection.selectedUserSessionIds.clear();
              state.filteredUserResponses = [];
              if (state.cacheMeta) {
                state.cacheMeta.userSessionsLastCheckedAt = null;
              }
              state._computedCache.clear();
            });
          },

          invalidateAll: () => {
            set((state) => {
              // Clear all questionnaire content
              state.questions.clear();
              // questionsByPosition is now computed on-demand, no need to clear it
              state.meta = null;

              // Clear all model data
              state.modelProfiles.clear();
              state.modelSessions.clear();

              // Clear all user data
              state.userSessions.clear();

              // Clear selection and filtered views
              state.selection.selectedModelIds.clear();
              state.selection.selectedUserSessionIds.clear();
              state.filteredModelResponses = [];
              state.filteredUserResponses = [];

              // Reset cache metadata (including modelsFetchedAt and userSessionsLastCheckedAt)
              state.cacheMeta = null;

              // Clear computed cache
              state._computedCache.clear();
            });
          },

          // Getters
          getQuestion: (questionId) => {
            return get().questions.get(questionId);
          },

          getQuestionsByPosition: () => {
            const state = get();
            return Array.from(state.questions.values()).sort(
              (a, b) => a.position - b.position,
            );
          },
        })),
        {
          name: storageKey,
          version: 2, // Bump version for migration from old format
          partialize: (state) => ({
            // Only persist core data, not ephemeral state
            meta: state.meta,
            questions: state.questions,
            modelProfiles: state.modelProfiles,
            modelSessions: state.modelSessions,
            userSessions: state.userSessions,
            cacheMeta: state.cacheMeta,
            // Do NOT persist: selection, filteredModelResponses, filteredUserResponses,
            // _computedCache, _performanceMetrics, _syncInProgress, _syncErrors, _syncQueue
          }),
          storage: customStorage,
          migrate: (
            persisted: unknown,
            version: number,
          ): Partial<TestAnalysisState> => {
            // Migration from version 1 (old global store) to version 2 (per-slug stores)
            if (version === 1) {
              // Old format had different structure - convert if needed
              const typed = persisted as Partial<TestAnalysisState> & {
                questionnaire?: QuestionnaireMeta;
                cacheMetadata?: {
                  questionnaireId: string;
                  version: number;
                  versionId: string;
                  modelsFetchedAt: number;
                  userSessionsLastChecked?: number | null;
                };
                modelSessions?: Array<
                  [
                    string,
                    (
                      | SessionResponses
                      | {
                          modelId?: string;
                          userId?: string;
                          [key: string]: unknown;
                        }
                    ),
                  ]
                >;
                userSessions?: Array<
                  [
                    string,
                    (
                      | SessionResponses
                      | {
                          modelId?: string;
                          userId?: string;
                          [key: string]: unknown;
                        }
                    ),
                  ]
                >;
              };

              // Convert old questionnaire to meta
              if (typed.questionnaire && !typed.meta) {
                typed.meta = typed.questionnaire;
              }

              // Convert old cacheMetadata to cacheMeta
              if (typed.cacheMetadata && !typed.cacheMeta) {
                const oldMeta = typed.cacheMetadata;
                typed.cacheMeta = {
                  questionnaireId: oldMeta.questionnaireId,
                  version: oldMeta.version,
                  versionId: oldMeta.versionId,
                  lastAccessedAt: Date.now(),
                  modelsFetchedAt: oldMeta.modelsFetchedAt ?? 0,
                  userSessionsLastCheckedAt:
                    oldMeta.userSessionsLastChecked ?? null,
                };
              }

              // Convert old SessionResponses format (modelId/userId) to subjectId/subjectType
              const convertSession = (
                session:
                  | SessionResponses
                  | {
                      modelId?: string;
                      userId?: string;
                      [key: string]: unknown;
                    },
              ): SessionResponses => {
                if (
                  "subjectId" in session &&
                  session.subjectId !== undefined &&
                  "subjectType" in session &&
                  session.subjectType !== undefined
                ) {
                  return session as SessionResponses; // Already converted
                }
                return {
                  ...(session as SessionResponses),
                  subjectId:
                    ("modelId" in session ? session.modelId : null) ??
                    ("userId" in session ? session.userId : null) ??
                    null,
                  subjectType:
                    "modelId" in session && session.modelId ? "model" : "user",
                };
              };

              if (typed.modelSessions && Array.isArray(typed.modelSessions)) {
                const modelSessionsMap = new Map<string, SessionResponses>();
                for (const entry of typed.modelSessions) {
                  const [k, v] = entry;
                  modelSessionsMap.set(k, convertSession(v));
                }
                (typed as Partial<TestAnalysisState>).modelSessions =
                  modelSessionsMap;
              }

              if (typed.userSessions && Array.isArray(typed.userSessions)) {
                const userSessionsMap = new Map<string, SessionResponses>();
                for (const entry of typed.userSessions) {
                  const [k, v] = entry;
                  userSessionsMap.set(k, convertSession(v));
                }
                (typed as Partial<TestAnalysisState>).userSessions =
                  userSessionsMap;
              }

              // Initialize selection if missing
              if (!typed.selection) {
                (typed as Partial<TestAnalysisState>).selection = {
                  selectedModelIds: new Set<string>(),
                  selectedUserSessionIds: new Set<string>(),
                };
              }
            }

            return persisted as Partial<TestAnalysisState>;
          },
        },
      ),
    ),
  );

  // Setup multi-tab synchronization
  if (typeof window !== "undefined") {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        // Compare timestamps to avoid stale overwrites
        try {
          const newData = JSON.parse(e.newValue) as {
            state?: { cacheMeta?: { lastAccessedAt?: number } };
          };
          const currentState = store.getState();

          // Only rehydrate if the new data is newer
          if (
            newData.state?.cacheMeta?.lastAccessedAt &&
            (!currentState.cacheMeta?.lastAccessedAt ||
              newData.state.cacheMeta.lastAccessedAt >
                currentState.cacheMeta.lastAccessedAt)
          ) {
            void store.persist.rehydrate();
          }
        } catch (error) {
          console.warn(`[Store ${slug}] Failed to parse storage event:`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    // Store cleanup function for this listener
    //
    // CLEANUP EXPLANATION:
    // ====================
    //
    // These cleanup functions are stored on `store._cleanup` but are NOT automatically
    // called. Stores are cached per slug in `storeInstances` Map and persist for the
    // lifetime of the application.
    //
    // When cleanup would be needed:
    // - During HMR (Hot Module Reload) in development - module reloads could create
    //   duplicate listeners if stores are recreated
    // - If implementing store eviction/destruction logic
    // - If stores were recreated on navigation (currently they're singletons)
    //
    // Current state:
    // - Cleanup is stored but never executed (stores are singletons)
    // - Event listeners remain attached for app lifetime
    // - In practice, this is fine since stores persist and aren't destroyed
    //
    // Future consideration:
    // - If implementing store cleanup/eviction, call `store._cleanup?.()` before
    //   removing from `storeInstances` Map
    // - Or remove this code if stores will always be singletons
    const cleanupStorage = () => {
      window.removeEventListener("storage", handleStorage);
    };
    // Attach cleanup to store for potential future use (currently unused)
    (store as typeof store & { _cleanup?: () => void })._cleanup =
      cleanupStorage;
  }

  // Setup online/offline listeners
  if (typeof window !== "undefined") {
    const handleOnline = () => {
      store.setState({ _isOnline: true });
      // Process queue when coming online
      const state = store.getState();
      for (const questionnaireId of state._syncQueue) {
        store.getState().syncUserSessions(questionnaireId).catch(console.error);
      }
    };

    const handleOffline = () => {
      store.setState({ _isOnline: false });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Store cleanup functions for these listeners
    //
    // NOTE: Same cleanup pattern as storage listener above - stored but not automatically
    // called. See comment above for full explanation. These cleanup functions are
    // chained together so calling `store._cleanup?.()` would remove all event listeners.
    const cleanupOnline = () => {
      window.removeEventListener("online", handleOnline);
    };
    const cleanupOffline = () => {
      window.removeEventListener("offline", handleOffline);
    };
    // Attach cleanup to store for potential future use (currently unused)
    // Chains with existing cleanup (storage listener) so one call removes all listeners
    const storeWithCleanup = store as typeof store & { _cleanup?: () => void };
    const existingCleanup = storeWithCleanup._cleanup;
    storeWithCleanup._cleanup = () => {
      existingCleanup?.();
      cleanupOnline();
      cleanupOffline();
    };
  }

  return store;
}
