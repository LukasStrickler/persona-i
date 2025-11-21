/**
 * Type definitions for questionnaire response handling
 */

export interface BatchResponseInput {
  questionId: string;
  value: string | number | boolean | string[];
  selectedOptionId?: string;
  selectedOptionIds?: string[];
}

export interface BatchResponseOutput {
  success: boolean;
  savedCount: number;
  failed: Array<{ questionId: string; error: string }>;
}

export interface ResponsePayload {
  questionId: string;
  value: string | number | boolean | string[];
  selectedOptionId?: string;
  selectedOptionIds?: string[];
}

export interface QuestionnaireItem {
  id: string;
  position: number;
  section: string | null;
  isRequired?: boolean;
  question: {
    id: string;
    prompt: string;
    questionTypeCode: string;
    configJson: unknown;
    options?: Array<{ id: string; label: string; value: string }>;
  };
  response: {
    selectedOptionId?: string | null;
    valueNumeric?: number | null;
    valueBoolean?: boolean | null;
    valueText?: string | null;
    rawPayloadJson?: unknown;
    valueType?: string | null;
  } | null;
}
