import type {
  QuestionnaireItem,
  ResponsePayload,
} from "@/lib/types/questionnaire-responses";
import { logger } from "@/lib/logger";

/**
 * Processes session data to extract sections, either from the sections array
 * or by grouping items by section name.
 */
export function processSections(sessionData: {
  sections?: Array<{
    name: string;
    items: Array<QuestionnaireItem>;
  }>;
  items: Array<QuestionnaireItem>;
}): Array<{
  name: string;
  items: Array<QuestionnaireItem>;
}> {
  if (sessionData.sections && sessionData.sections.length > 0) {
    return sessionData.sections;
  }
  // Fallback: group items by section
  const itemsBySection = new Map<string, QuestionnaireItem[]>();
  for (const item of sessionData.items) {
    const sectionName = item.section ?? "Uncategorized";
    if (!itemsBySection.has(sectionName)) {
      itemsBySection.set(sectionName, []);
    }
    itemsBySection.get(sectionName)?.push(item);
  }
  return Array.from(itemsBySection.entries())
    .map(([name, items]) => ({
      name,
      items: items.sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => {
      const minA = Math.min(...a.items.map((item) => item.position));
      const minB = Math.min(...b.items.map((item) => item.position));
      return minA - minB;
    });
}

/**
 * Initializes responses state from existing session data.
 * Extracts response values based on valueType.
 */
export function initializeResponsesFromSessionData(
  items: Array<QuestionnaireItem>,
): Record<string, string | number | boolean | string[]> {
  const initial: Record<string, string | number | boolean | string[]> = {};
  for (const item of items) {
    if (item.response?.valueType) {
      // Use valueType to directly access the correct field
      switch (item.response.valueType) {
        case "multi_choice":
          if (
            item.response.rawPayloadJson &&
            Array.isArray(item.response.rawPayloadJson)
          ) {
            initial[item.question.id] = item.response
              .rawPayloadJson as string[];
          }
          break;
        case "numeric":
          if (
            item.response.valueNumeric !== null &&
            item.response.valueNumeric !== undefined
          ) {
            initial[item.question.id] = item.response.valueNumeric;
          }
          break;
        case "boolean":
          if (
            item.response.valueBoolean !== null &&
            item.response.valueBoolean !== undefined
          ) {
            initial[item.question.id] = item.response.valueBoolean;
          }
          break;
        case "text":
          if (
            item.response.valueText !== null &&
            item.response.valueText !== undefined
          ) {
            initial[item.question.id] = item.response.valueText;
          }
          break;
        case "option":
          // For single choice: try selectedOptionId first, fallback to valueText
          if (item.response.selectedOptionId) {
            const option = findOptionById(
              item.question,
              item.response.selectedOptionId,
            );
            if (option) {
              initial[item.question.id] = option.value;
            } else if (
              item.response.valueText !== null &&
              item.response.valueText !== undefined
            ) {
              // Fallback: use valueText directly if option not found by ID
              // This handles cases where options are in configJson without IDs
              initial[item.question.id] = item.response.valueText;
            }
          } else if (
            item.response.valueText !== null &&
            item.response.valueText !== undefined
          ) {
            // If selectedOptionId is null, use valueText directly
            // This happens when options are in configJson without IDs
            initial[item.question.id] = item.response.valueText;
          }
          break;
      }
    }
  }
  return initial;
}

/**
 * Resolves question options from either question.options or configJson.
 * Returns a normalized array of { value, label } objects.
 */
export function resolveQuestionOptions(
  question: QuestionnaireItem["question"],
): Array<{ value: string; label: string }> {
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.options.map((opt) => ({
      value: opt?.value ?? "",
      label: opt?.label ?? "",
    }));
  }

  const configOptions = (
    question.configJson as {
      options?: Array<{ value: string; label: string }>;
    }
  )?.options;
  if (Array.isArray(configOptions)) {
    return configOptions
      .filter((opt) => opt)
      .map((opt) => ({
        value: opt?.value ?? "",
        label: opt?.label ?? "",
      }));
  }

  return [] as Array<{ value: string; label: string }>;
}

/**
 * Finds an option ID by value, checking both question.options and configJson.options.
 * Returns the option ID if found, undefined otherwise.
 */
export function findOptionIdByValue(
  question: QuestionnaireItem["question"],
  value: string,
): string | undefined {
  // First check question.options (has IDs)
  if (Array.isArray(question.options) && question.options.length > 0) {
    const option = question.options.find((o) => o?.value === value);
    if (option?.id) {
      return option.id;
    }
  }

  // Then check configJson.options (may not have IDs, but we check anyway)
  const configOptions = (
    question.configJson as {
      options?: Array<{ id?: string; value: string; label: string }>;
    }
  )?.options;
  if (Array.isArray(configOptions)) {
    const option = configOptions.find((o) => o?.value === value);
    if (option?.id) {
      return option.id;
    }
  }

  return undefined;
}

/**
 * Finds an option by ID, checking both question.options and configJson.options.
 * Returns the option with value and label if found, undefined otherwise.
 */
export function findOptionById(
  question: QuestionnaireItem["question"],
  optionId: string,
): { value: string; label: string } | undefined {
  // First check question.options (has IDs)
  if (Array.isArray(question.options) && question.options.length > 0) {
    const option = question.options.find((o) => o?.id === optionId);
    if (option) {
      return {
        value: option.value ?? "",
        label: option.label ?? "",
      };
    }
  }

  // Then check configJson.options (may have IDs)
  const configOptions = (
    question.configJson as {
      options?: Array<{ id?: string; value: string; label: string }>;
    }
  )?.options;
  if (Array.isArray(configOptions)) {
    const option = configOptions.find((o) => o?.id === optionId);
    if (option) {
      return {
        value: option.value ?? "",
        label: option.label ?? "",
      };
    }
  }

  return undefined;
}

/**
 * Builds a payload array for batch response saving
 *
 * Converts local React state (responses map) into the format expected by
 * the `saveResponsesBatch` mutation. Maps option values to option IDs
 * for single_choice and multi_choice question types.
 *
 * @param items - Array of questionnaire items with question definitions
 * @param responses - Map of questionId to response value from React state
 * @returns Array of response payloads ready for batch save
 *
 * @example
 * ```ts
 * const payload = buildResponsesPayload(sessionData.items, responses);
 * await saveResponsesBatch.mutateAsync({ sessionId, responses: payload });
 * ```
 */
export function buildResponsesPayload(
  items: QuestionnaireItem[],
  responses: Record<string, string | number | boolean | string[]>,
): ResponsePayload[] {
  const payload: ResponsePayload[] = [];

  for (const item of items) {
    const value = responses[item.question.id];
    if (value === undefined) continue;

    const question = item.question;
    const responseObj: ResponsePayload = {
      questionId: question.id,
      value,
    };

    // For single_choice, find option ID
    if (question.questionTypeCode === "single_choice") {
      const optionId = question.options?.find((o) => o.value === value)?.id;
      if (optionId) {
        responseObj.selectedOptionId = optionId;
      } else {
        // Skip this response as it's invalid - value doesn't match any option
        if (process.env.NODE_ENV === "development") {
          logger.dev(
            `[buildResponsesPayload] Option ID not found for single_choice question ${question.id} with value: ${String(value)}. Skipping response.`,
          );
        }
        continue;
      }
    }

    // For multi_choice, map values to option IDs
    if (question.questionTypeCode === "multi_choice" && Array.isArray(value)) {
      const optionIds = value
        .map((val) => question.options?.find((o) => o.value === val)?.id)
        .filter((id): id is string => id !== undefined);
      if (optionIds.length > 0) {
        responseObj.selectedOptionIds = optionIds;
      }
      // Warn in development if some option IDs were not found
      if (
        process.env.NODE_ENV === "development" &&
        optionIds.length < value.length
      ) {
        const missingValues = value.filter(
          (val) => !question.options?.some((o) => o.value === val),
        );
        logger.dev(
          `[buildResponsesPayload] Some option IDs not found for multi_choice question ${question.id}. Missing values:`,
          missingValues,
        );
      }
    }

    payload.push(responseObj);
  }

  return payload;
}
