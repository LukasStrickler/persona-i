/**
 * Question type definitions - TypeScript types defined first, then used in DB
 */

export enum QuestionTypeCode {
  SINGLE_CHOICE = "single_choice",
  MULTI_CHOICE = "multi_choice",
  SCALAR = "scalar",
  BOOLEAN = "boolean",
  TEXT = "text",
}

/**
 * Configuration for scalar questions (range-based)
 */
export type ScalarConfig = {
  min: number;
  max: number;
  step?: number;
  labels?: {
    min: string;
    max: string;
  };
};

/**
 * Configuration for single choice questions
 */
export type SingleChoiceConfig = {
  options: Array<{
    label: string;
    value: string;
  }>;
};

/**
 * Configuration for multi choice questions
 */
export type MultiChoiceConfig = {
  options: Array<{
    label: string;
    value: string;
  }>;
  minSelections?: number;
  maxSelections?: number;
};

/**
 * Configuration for boolean questions
 */
export type BooleanConfig = {
  trueLabel?: string;
  falseLabel?: string;
};

/**
 * Configuration for text questions
 */
export type TextConfig = {
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
};

/**
 * Discriminated union of all question type configurations
 */
export type QuestionTypeConfig =
  | { type: QuestionTypeCode.SCALAR; config: ScalarConfig }
  | { type: QuestionTypeCode.SINGLE_CHOICE; config: SingleChoiceConfig }
  | { type: QuestionTypeCode.MULTI_CHOICE; config: MultiChoiceConfig }
  | { type: QuestionTypeCode.BOOLEAN; config: BooleanConfig }
  | { type: QuestionTypeCode.TEXT; config: TextConfig };

/**
 * Type guard to check if a value is a valid QuestionTypeCode
 */
export function isQuestionTypeCode(value: string): value is QuestionTypeCode {
  return Object.values(QuestionTypeCode).includes(value as QuestionTypeCode);
}

/**
 * Get the default config for a question type
 */
export function getDefaultConfig(
  type: QuestionTypeCode,
): QuestionTypeConfig["config"] {
  switch (type) {
    case QuestionTypeCode.SCALAR:
      return { min: 0, max: 10, step: 1 };
    case QuestionTypeCode.SINGLE_CHOICE:
      return { options: [] };
    case QuestionTypeCode.MULTI_CHOICE:
      return { options: [] };
    case QuestionTypeCode.BOOLEAN:
      return { trueLabel: "Yes", falseLabel: "No" };
    case QuestionTypeCode.TEXT:
      return { multiline: false };
  }
}
