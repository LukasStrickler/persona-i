import type {
  QuestionnaireItem,
  ResponsePayload,
} from "@/lib/types/questionnaire-responses";
import { logger } from "@/lib/logger";

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
