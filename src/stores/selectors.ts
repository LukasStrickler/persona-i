import { useMemo, useRef, createContext, useContext } from "react";
import { shallow } from "zustand/shallow";
import { createTestAnalysisStore } from "./useTestAnalysisStore";
import type { Question } from "./useTestAnalysisStore";

// Context for current questionnaire slug
const QuestionnaireSlugContext = createContext<string | null>(null);

export const QuestionnaireSlugProvider = QuestionnaireSlugContext.Provider;

export function useQuestionnaireSlug(): string {
  const slug = useContext(QuestionnaireSlugContext);
  if (!slug) {
    throw new Error(
      "useQuestionnaireSlug must be used within QuestionnaireSlugProvider",
    );
  }
  return slug;
}

// Helper to get store for current slug
function useStore() {
  const slug = useQuestionnaireSlug();
  return createTestAnalysisStore(slug);
}

// Helper to use store selector with shallow comparison
// Zustand 5 supports shallow but TypeScript types need help
function useStoreShallow<T>(
  store: ReturnType<typeof createTestAnalysisStore>,
  selector: (state: ReturnType<typeof store.getState>) => T,
): T {
  // @ts-expect-error - Zustand 5 supports equalityFn as second arg but types may not reflect it
  return store(selector, shallow);
}

/**
 * Get questions array (sorted by position)
 * Memoized to prevent infinite loops
 */
export const useQuestions = () => {
  const store = useStore();
  const size = store((state) => state.questions.size);
  const prevKeysRef = useRef<string>("");
  const cachedArrayRef = useRef<Question[]>([]);

  return useMemo(() => {
    const state = store.getState();
    const currentKeys = Array.from(state.questions.keys()).sort().join(",");

    // Only update if keys actually changed
    if (currentKeys !== prevKeysRef.current) {
      prevKeysRef.current = currentKeys;
      cachedArrayRef.current = state.getQuestionsByPosition();
      return cachedArrayRef.current;
    }

    // Return cached array if keys haven't changed
    return cachedArrayRef.current;
  }, [size, store]);
};

/**
 * Get filtered model responses
 * Uses shallow comparison to prevent re-renders when array reference changes but contents are identical
 */
export const useModelResponses = () => {
  const store = useStore();
  return useStoreShallow(store, (state) => state.filteredModelResponses);
};

/**
 * Get filtered user responses
 * Uses shallow comparison to prevent re-renders when array reference changes but contents are identical
 */
export const useHumanResponses = () => {
  const store = useStore();
  return useStoreShallow(store, (state) => state.filteredUserResponses);
};

/**
 * Get selected model IDs (memoized to prevent infinite loops)
 */
export const useSelectedModels = () => {
  const store = useStore();
  const size = store((state) => state.selection.selectedModelIds.size);
  const prevKeysRef = useRef<string>("");
  const cachedArrayRef = useRef<string[]>([]);

  return useMemo(() => {
    const state = store.getState();
    const currentKeys = Array.from(state.selection.selectedModelIds)
      .sort()
      .join(",");

    // Only update if keys actually changed
    if (currentKeys !== prevKeysRef.current) {
      prevKeysRef.current = currentKeys;
      cachedArrayRef.current = Array.from(state.selection.selectedModelIds);
      return cachedArrayRef.current;
    }

    // Return cached array if keys haven't changed
    return cachedArrayRef.current;
  }, [size, store]);
};

/**
 * Get selected user session IDs (memoized to prevent infinite loops)
 */
export const useSelectedUserSessions = () => {
  const store = useStore();
  const size = store((state) => state.selection.selectedUserSessionIds.size);
  const prevKeysRef = useRef<string>("");
  const cachedArrayRef = useRef<string[]>([]);

  return useMemo(() => {
    const state = store.getState();
    const currentKeys = Array.from(state.selection.selectedUserSessionIds)
      .sort()
      .join(",");

    if (currentKeys !== prevKeysRef.current) {
      prevKeysRef.current = currentKeys;
      cachedArrayRef.current = Array.from(
        state.selection.selectedUserSessionIds,
      );
      return cachedArrayRef.current;
    }

    return cachedArrayRef.current;
  }, [size, store]);
};

/**
 * Get all responses for a specific question
 * Returns both model and user responses
 * Uses shallow comparison and memoization to prevent infinite loops
 */
export const useQuestionResponses = (questionId: string) => {
  const store = useStore();
  // Subscribe to the filtered responses arrays with shallow comparison
  // This prevents re-renders when array reference changes but contents are identical
  const modelResponses = useStoreShallow(
    store,
    (state) => state.filteredModelResponses,
  );
  const userResponses = useStoreShallow(
    store,
    (state) => state.filteredUserResponses,
  );
  const prevResultRef = useRef<{
    questionId: string;
    modelsKey: string;
    humansKey: string;
    models: Array<{
      modelId: string;
      displayName: string;
      value: string | number | boolean | string[] | null;
      valueType: string | null;
    }>;
    humans: Array<{
      sessionId: string;
      displayName: string;
      value: string | number | boolean | string[] | null;
      valueType: string | null;
    }>;
  } | null>(null);

  return useMemo(() => {
    const models: Array<{
      modelId: string;
      displayName: string;
      value: string | number | boolean | string[] | null;
      valueType: string | null;
    }> = [];
    const humans: Array<{
      sessionId: string;
      displayName: string;
      value: string | number | boolean | string[] | null;
      valueType: string | null;
    }> = [];

    // Get model responses - updated to use subjectId/subjectType
    for (const session of modelResponses) {
      const response = session.responses.get(questionId);
      if (
        response &&
        session.subjectType === "model" &&
        session.subjectId !== null
      ) {
        models.push({
          modelId: session.subjectId,
          displayName: session.displayName,
          value: response.value,
          valueType: response.valueType,
        });
      }
    }

    // Get user responses
    for (const session of userResponses) {
      const response = session.responses.get(questionId);
      if (response) {
        humans.push({
          sessionId: session.sessionId,
          displayName: session.displayName,
          value: response.value,
          valueType: response.valueType,
        });
      }
    }

    // Create a key to check if data actually changed
    const modelsKey = models
      .map((m) => `${m.modelId}:${String(m.value ?? "null")}`)
      .sort()
      .join(",");
    const humansKey = humans
      .map((h) => `${h.sessionId}:${String(h.value ?? "null")}`)
      .sort()
      .join(",");

    // Return cached result if data hasn't changed
    if (
      prevResultRef.current?.questionId === questionId &&
      prevResultRef.current.modelsKey === modelsKey &&
      prevResultRef.current.humansKey === humansKey
    ) {
      return prevResultRef.current;
    }

    const result = { models, humans };
    prevResultRef.current = {
      questionId,
      modelsKey,
      humansKey,
      ...result,
    };
    return result;
  }, [questionId, modelResponses, userResponses]);
};

/**
 * Get questionnaire metadata
 */
export const useQuestionnaire = () => {
  const store = useStore();
  return store((state) => state.meta);
};

/**
 * Get model filter actions
 */
export const useModelFilter = () => {
  const store = useStore();
  const selectedIds = useSelectedModels(); // Use the memoized version
  const setModelSelection = store((state) => state.setModelSelection);

  return {
    selectedIds,
    toggle: (modelId: string) => {
      const state = store.getState();
      const newSet = new Set(state.selection.selectedModelIds);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      setModelSelection(Array.from(newSet));
    },
    setFilter: setModelSelection,
  };
};

/**
 * Get user session selection actions
 */
export const useUserSessionSelection = () => {
  const store = useStore();
  const selectedIds = useSelectedUserSessions(); // Use the memoized version
  const setUserSessionSelection = store(
    (state) => state.setUserSessionSelection,
  );

  return {
    selectedIds,
    toggle: (sessionId: string) => {
      const state = store.getState();
      const newSet = new Set(state.selection.selectedUserSessionIds);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      setUserSessionSelection(Array.from(newSet));
    },
    setSelection: setUserSessionSelection,
  };
};

/**
 * Get all model profiles as array (memoized to prevent infinite loops)
 * Uses size to detect changes instead of Map reference
 */
export const useModelProfiles = () => {
  const store = useStore();
  const size = store((state) => state.modelProfiles.size);
  const prevKeysRef = useRef<string>("");
  const cachedArrayRef = useRef<
    Array<{
      id: string;
      displayName: string;
      subjectType: "llm";
      metadataJson?: unknown;
    }>
  >([]);

  return useMemo(() => {
    const state = store.getState();
    const currentKeys = Array.from(state.modelProfiles.keys()).sort().join(",");

    if (currentKeys !== prevKeysRef.current) {
      prevKeysRef.current = currentKeys;
      cachedArrayRef.current = Array.from(state.modelProfiles.values());
      return cachedArrayRef.current;
    }

    return cachedArrayRef.current;
  }, [size, store]);
};

/**
 * Get questions grouped by section
 * Returns array of { section: string, questions: Question[] }
 * Uses filtered model/user responses based on current selections
 * Memoized to prevent unnecessary re-renders
 */
export const useQuestionsBySection = () => {
  const store = useStore();
  const questionsSize = store((state) => state.questions.size);
  const prevResultRef = useRef<
    Array<{ section: string; questions: Question[] }>
  >([]);
  const prevKeysRef = useRef<string>("");

  return useMemo(() => {
    const state = store.getState();
    const questionsByPosition = state.getQuestionsByPosition();
    const currentKeys = questionsByPosition
      .map((q) => q.id)
      .sort()
      .join(",");

    // Return cached result if questions haven't changed
    if (
      currentKeys === prevKeysRef.current &&
      prevResultRef.current.length > 0
    ) {
      return prevResultRef.current;
    }

    const sections = new Map<string, typeof questionsByPosition>();

    for (const question of questionsByPosition) {
      const section = question.section ?? "Uncategorized";
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(question);
    }

    const result = Array.from(sections.entries()).map(
      ([section, questions]) => ({
        section,
        questions,
      }),
    );

    prevKeysRef.current = currentKeys;
    prevResultRef.current = result;
    return result;
  }, [questionsSize, store]);
};

/**
 * Get questions for a specific section
 * Returns questions array for the given section name
 */
export const useQuestionsInSection = (sectionName: string) => {
  const store = useStore();
  return store((state) => {
    return state
      .getQuestionsByPosition()
      .filter((q) => (q.section ?? "Uncategorized") === sectionName);
  });
};

/**
 * Get all section names
 * Returns array of unique section names (including "Uncategorized" for null sections)
 * Memoized to prevent unnecessary re-renders
 */
export const useSections = () => {
  const store = useStore();
  const questionsSize = store((state) => state.questions.size);
  const prevResultRef = useRef<string[]>([]);
  const prevKeysRef = useRef<string>("");

  return useMemo(() => {
    const state = store.getState();
    const questionsByPosition = state.getQuestionsByPosition();
    const currentKeys = questionsByPosition
      .map((q) => q.id)
      .sort()
      .join(",");

    // Return cached result if questions haven't changed
    if (
      currentKeys === prevKeysRef.current &&
      prevResultRef.current.length > 0
    ) {
      return prevResultRef.current;
    }

    const sections = new Set<string>();
    for (const question of questionsByPosition) {
      sections.add(question.section ?? "Uncategorized");
    }

    const result = Array.from(sections);
    prevKeysRef.current = currentKeys;
    prevResultRef.current = result;
    return result;
  }, [questionsSize, store]);
};

/**
 * Get responses grouped by section
 * Returns array of { section: string, questions: Array<{ question, modelResponses, userResponses }> }
 * Uses filtered model/user responses based on current selections
 * Memoized to prevent unnecessary re-renders
 */
export const useResponsesBySection = () => {
  const store = useStore();
  // Subscribe to arrays with shallow comparison
  const modelResponses = useStoreShallow(
    store,
    (state) => state.filteredModelResponses,
  );
  const userResponses = useStoreShallow(
    store,
    (state) => state.filteredUserResponses,
  );
  const questionsSize = store((state) => state.questions.size);
  const prevResultRef = useRef<
    Array<{
      section: string;
      items: Array<{
        question: Question;
        modelResponses: Array<{
          modelId: string;
          displayName: string;
          value: string | number | boolean | string[] | null;
          valueType: string | null;
        }>;
        userResponses: Array<{
          sessionId: string;
          displayName: string;
          value: string | number | boolean | string[] | null;
          valueType: string | null;
        }>;
      }>;
    }>
  >([]);
  const prevKeysRef = useRef<string>("");

  return useMemo(() => {
    const state = store.getState();
    const questionsByPosition = state.getQuestionsByPosition();
    const currentKeys = questionsByPosition
      .map((q) => q.id)
      .sort()
      .join(",");

    // Create a key for responses to detect changes
    const responsesKey = `${modelResponses.length}:${userResponses.length}`;
    const fullKey = `${currentKeys}:${responsesKey}`;

    // Return cached result if data hasn't changed
    if (fullKey === prevKeysRef.current && prevResultRef.current.length > 0) {
      return prevResultRef.current;
    }

    const sections = new Map<
      string,
      Array<{
        question: Question;
        modelResponses: Array<{
          modelId: string;
          displayName: string;
          value: string | number | boolean | string[] | null;
          valueType: string | null;
        }>;
        userResponses: Array<{
          sessionId: string;
          displayName: string;
          value: string | number | boolean | string[] | null;
          valueType: string | null;
        }>;
      }>
    >();

    for (const question of questionsByPosition) {
      const section = question.section ?? "Uncategorized";
      if (!sections.has(section)) {
        sections.set(section, []);
      }

      // Get model responses for this question (from filtered responses)
      const modelResponsesForQuestion: Array<{
        modelId: string;
        displayName: string;
        value: string | number | boolean | string[] | null;
        valueType: string | null;
      }> = [];
      for (const session of modelResponses) {
        const response = session.responses.get(question.id);
        if (
          response &&
          session.subjectType === "model" &&
          session.subjectId !== null
        ) {
          modelResponsesForQuestion.push({
            modelId: session.subjectId,
            displayName: session.displayName,
            value: response.value,
            valueType: response.valueType,
          });
        }
      }

      // Get user responses for this question (from filtered responses)
      const userResponsesForQuestion: Array<{
        sessionId: string;
        displayName: string;
        value: string | number | boolean | string[] | null;
        valueType: string | null;
      }> = [];
      for (const session of userResponses) {
        const response = session.responses.get(question.id);
        if (response) {
          userResponsesForQuestion.push({
            sessionId: session.sessionId,
            displayName: session.displayName,
            value: response.value,
            valueType: response.valueType,
          });
        }
      }

      sections.get(section)!.push({
        question,
        modelResponses: modelResponsesForQuestion,
        userResponses: userResponsesForQuestion,
      });
    }

    const result = Array.from(sections.entries()).map(([section, items]) => ({
      section,
      items,
    }));

    prevKeysRef.current = fullKey;
    prevResultRef.current = result;
    return result;
  }, [questionsSize, modelResponses, userResponses, store]);
};
