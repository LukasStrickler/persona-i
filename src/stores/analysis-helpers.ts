import { createTestAnalysisStore } from "./useTestAnalysisStore";
import type { Question } from "./useTestAnalysisStore";

/**
 * Get all responses (model + user) for a specific question
 */
export function getResponsesByQuestion(questionId: string, slug: string) {
  const store = createTestAnalysisStore(slug);
  const state = store.getState();
  const models: Array<{
    modelId: string;
    displayName: string;
    value: string | number | boolean | string[] | null;
  }> = [];
  const humans: Array<{
    sessionId: string;
    displayName: string;
    value: string | number | boolean | string[] | null;
  }> = [];

  // Updated to use subjectId/subjectType
  for (const session of state.filteredModelResponses) {
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
      });
    }
  }

  for (const session of state.filteredUserResponses) {
    const response = session.responses.get(questionId);
    if (response) {
      humans.push({
        sessionId: session.sessionId,
        displayName: session.displayName,
        value: response.value,
      });
    }
  }

  return { models, humans };
}

/**
 * Compute statistics for a question
 */
export function getQuestionStatistics(questionId: string, slug: string) {
  const { models, humans } = getResponsesByQuestion(questionId, slug);
  const allValues = [
    ...models.map((m) => m.value),
    ...humans.map((h) => h.value),
  ].filter((v) => v !== null && v !== undefined) as Array<
    number | string | boolean
  >;

  if (allValues.length === 0) {
    return {
      mean: null,
      median: null,
      mode: null,
      count: 0,
      distribution: {},
    };
  }

  // For numeric values
  const numericValues = allValues.filter(
    (v): v is number => typeof v === "number",
  );
  const mean =
    numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : null;

  const sortedNumeric = [...numericValues].sort((a, b) => a - b);
  const median =
    sortedNumeric.length > 0
      ? sortedNumeric.length % 2 === 0
        ? (sortedNumeric[sortedNumeric.length / 2 - 1]! +
            sortedNumeric[sortedNumeric.length / 2]!) /
          2
        : sortedNumeric[Math.floor(sortedNumeric.length / 2)]!
      : null;

  // Mode (most frequent value)
  const frequency = new Map<string | number | boolean, number>();
  for (const value of allValues) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      frequency.set(value, (frequency.get(value) ?? 0) + 1);
    } else if (Array.isArray(value)) {
      // For arrays, convert to string for frequency counting
      const arrayStr = JSON.stringify(value);
      frequency.set(arrayStr, (frequency.get(arrayStr) ?? 0) + 1);
    }
  }
  let mode: string | number | boolean | null = null;
  let maxFreq = 0;
  for (const [value, freq] of frequency.entries()) {
    if (freq > maxFreq) {
      maxFreq = freq;
      // Only set mode if it's not a JSON string (i.e., it's a primitive)
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        mode = value;
      }
    }
  }

  // Distribution
  const distribution: Record<string, number> = {};
  for (const [value, freq] of frequency.entries()) {
    distribution[String(value)] = freq ?? 0;
  }

  return {
    mean,
    median,
    mode,
    count: allValues.length,
    distribution,
  };
}

/**
 * Compare all models side-by-side for a question
 */
export function getModelComparison(questionId: string, slug: string) {
  const { models } = getResponsesByQuestion(questionId, slug);
  return models.map((m) => ({
    modelId: m.modelId,
    displayName: m.displayName,
    value: m.value,
  }));
}

/**
 * Compare user session vs all models for a question
 */
export function getUserVsModels(
  questionId: string,
  sessionId: string,
  slug: string,
) {
  const store = createTestAnalysisStore(slug);
  const state = store.getState();
  const userSession = state.userSessions.get(sessionId);
  if (!userSession) {
    return { user: null, models: [] };
  }
  const userResponse = userSession.responses.get(questionId);

  const models = getModelComparison(questionId, slug);

  return {
    user: userResponse
      ? {
          sessionId,
          displayName: userSession.displayName,
          value: userResponse.value,
        }
      : null,
    models,
  };
}

/**
 * Get response distribution for charting (histogram data)
 */
export function getResponseDistribution(
  questionId: string,
  slug: string,
  type: "numeric" | "categorical" = "numeric",
) {
  const { models, humans } = getResponsesByQuestion(questionId, slug);
  const allValues = [
    ...models.map((m) => m.value),
    ...humans.map((h) => h.value),
  ].filter((v) => v !== null && v !== undefined);

  if (type === "numeric") {
    const numericValues = allValues.filter((v) => typeof v === "number");
    if (numericValues.length === 0) return [];

    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const bins = 10;
    const binSize = (max - min) / bins;

    const histogram = Array.from({ length: bins }, () => 0);
    for (const value of numericValues) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex] = (histogram[binIndex] ?? 0) + 1;
    }

    return histogram.map((count, index) => ({
      bin: min + index * binSize,
      count,
      label: `${(min + index * binSize).toFixed(1)}-${(min + (index + 1) * binSize).toFixed(1)}`,
    }));
  } else {
    // Categorical distribution
    const frequency = new Map<string | number | boolean, number>();
    for (const value of allValues) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        frequency.set(value, (frequency.get(value) ?? 0) + 1);
      } else if (Array.isArray(value)) {
        // For arrays, convert to string for frequency counting
        const arrayStr = JSON.stringify(value);
        frequency.set(arrayStr, (frequency.get(arrayStr) ?? 0) + 1);
      }
    }

    return Array.from(frequency.entries()).map(([value, count]) => ({
      label: String(value),
      value: count,
    }));
  }
}

/**
 * Group responses by questionnaire section
 */
export function getAggregatedBySection(slug: string) {
  const store = createTestAnalysisStore(slug);
  const state = store.getState();
  const sections = new Map<
    string,
    Array<{ questionId: string; question: Question; responses: unknown[] }>
  >();

  for (const question of state.getQuestionsByPosition()) {
    const section = question.section ?? "Uncategorized";
    if (!sections.has(section)) {
      sections.set(section, []);
    }

    const { models, humans } = getResponsesByQuestion(question.id, slug);
    sections.get(section)!.push({
      questionId: question.id,
      question,
      responses: [...models, ...humans],
    });
  }

  return Array.from(sections.entries()).map(([section, items]) => ({
    section,
    items,
  }));
}

/**
 * Get question × session response matrix (for heatmaps)
 */
export function getQuestionResponseMatrix(slug: string) {
  const store = createTestAnalysisStore(slug);
  const state = store.getState();
  const allSessions = [
    ...state.filteredModelResponses,
    ...state.filteredUserResponses,
  ];

  return state.getQuestionsByPosition().map((question) => ({
    questionId: question.id,
    questionPrompt: question.prompt,
    responses: allSessions.map((session) => ({
      sessionId: session.sessionId,
      displayName: session.displayName,
      value: session.responses.get(question.id)?.value ?? null,
    })),
  }));
}

/**
 * Calculate similarity scores between user session and models
 */
export function getModelSimilarity(sessionId: string, slug: string) {
  const store = createTestAnalysisStore(slug);
  const state = store.getState();
  const userSession = state.userSessions.get(sessionId);
  if (!userSession) {
    return [];
  }

  const similarities: Array<{
    modelId: string;
    displayName: string;
    similarity: number;
  }> = [];

  for (const modelSession of state.filteredModelResponses) {
    if (modelSession.subjectType !== "model" || !modelSession.subjectId)
      continue;

    let matches = 0;
    let total = 0;

    for (const [questionId, userResponse] of userSession.responses.entries()) {
      const modelResponse = modelSession.responses.get(questionId);
      if (modelResponse && userResponse) {
        total++;
        if (userResponse.value === modelResponse.value) {
          matches++;
        }
      }
    }

    const similarity = total > 0 ? matches / total : 0;
    similarities.push({
      modelId: modelSession.subjectId,
      displayName: modelSession.displayName,
      similarity,
    });
  }

  return similarities.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get top N most similar models to a user session
 */
export function getTopModels(sessionId: string, slug: string, limit = 5) {
  return getModelSimilarity(sessionId, slug).slice(0, limit);
}
