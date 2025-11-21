/**
 * Shared utilities for mapping response values to database format
 */

import {
  isQuestionTypeCode,
  QuestionTypeCode,
} from "@/lib/types/question-types";

export interface ResponseData {
  assessmentSessionId: string;
  questionId: string;
  selectedOptionId?: string | null;
  valueNumeric?: number | null;
  valueBoolean?: boolean | null;
  valueText?: string | null;
  rawPayloadJson?: unknown;
  valueType?: string | null;
  updatedAt: Date;
}

export interface ResponseInput {
  value: string | number | boolean | string[];
  selectedOptionId?: string;
  selectedOptionIds?: string[];
}

/**
 * Maps a response value to the correct database fields based on question type
 *
 * @param questionTypeCode - The type of question (single_choice, multi_choice, scalar, boolean, text)
 * @param input - The response input containing value and optional option IDs
 * @param baseData - Base response data (assessmentSessionId, questionId, updatedAt)
 * @returns ResponseData object with correct fields set based on question type
 * @throws Error if questionTypeCode is not a valid question type
 */
export function mapResponseValueToData(
  questionTypeCode: string,
  input: ResponseInput,
  baseData: {
    assessmentSessionId: string;
    questionId: string;
    updatedAt: Date;
  },
): ResponseData {
  // Validate question type
  if (!isQuestionTypeCode(questionTypeCode)) {
    throw new Error(
      `Invalid question type: ${questionTypeCode}. Question ID: ${baseData.questionId}`,
    );
  }

  // Type narrowing: questionTypeCode is now QuestionTypeCode after validation
  const typeCode: QuestionTypeCode = questionTypeCode;

  const responseData: ResponseData = {
    ...baseData,
    selectedOptionId: null,
    valueNumeric: null,
    valueBoolean: null,
    valueText: null,
    rawPayloadJson: null,
    valueType: null,
  };

  // Set value based on question type and set valueType for easy client access

  if (typeCode === QuestionTypeCode.SINGLE_CHOICE) {
    responseData.selectedOptionId = input.selectedOptionId ?? null;
    responseData.valueText =
      typeof input.value === "string" ? input.value : null;
    responseData.valueType = "option";
  } else if (typeCode === QuestionTypeCode.MULTI_CHOICE) {
    // Store array of selected option values in rawPayloadJson
    if (Array.isArray(input.value)) {
      responseData.rawPayloadJson = input.value;
    }
    responseData.valueType = "multi_choice";
    // Note: We don't use selectedOptionId for multi-choice since it's singular
    // The rawPayloadJson contains the array of selected option values
  } else if (typeCode === QuestionTypeCode.SCALAR) {
    responseData.valueNumeric =
      typeof input.value === "number" ? input.value : null;
    responseData.valueType = "numeric";
  } else if (typeCode === QuestionTypeCode.BOOLEAN) {
    responseData.valueBoolean =
      typeof input.value === "boolean" ? input.value : null;
    responseData.valueType = "boolean";
  } else if (typeCode === QuestionTypeCode.TEXT) {
    responseData.valueText =
      typeof input.value === "string" ? input.value : null;
    responseData.valueType = "text";
  }

  return responseData;
}
