/**
 * Utility functions for extracting values from response objects
 */

export type ResponseValueType =
  | "numeric"
  | "boolean"
  | "text"
  | "option"
  | "multi_choice";

export interface ResponseWithValueType {
  valueType?: ResponseValueType | null;
  valueNumeric?: number | null;
  valueBoolean?: boolean | null;
  valueText?: string | null;
  selectedOptionId?: string | null;
  rawPayloadJson?: unknown;
}

/**
 * Extract the actual value from a response object using the valueType field
 * @param response - Response object with valueType field
 * @param optionValueMap - Optional map of optionId -> optionValue for "option" type responses
 * @returns The extracted value, or null if not found
 */
export function getResponseValue(
  response: ResponseWithValueType,
  optionValueMap?: Map<string, string>,
): string | number | boolean | string[] | null {
  if (!response.valueType) {
    // Fallback: try to infer from non-null fields (for backward compatibility)
    if (response.valueNumeric !== null && response.valueNumeric !== undefined) {
      return response.valueNumeric;
    }
    if (response.valueBoolean !== null && response.valueBoolean !== undefined) {
      return response.valueBoolean;
    }
    if (response.valueText) {
      return response.valueText;
    }
    if (response.rawPayloadJson && Array.isArray(response.rawPayloadJson)) {
      return response.rawPayloadJson as string[];
    }
    if (response.selectedOptionId && optionValueMap) {
      return optionValueMap.get(response.selectedOptionId) ?? null;
    }
    return null;
  }

  switch (response.valueType) {
    case "numeric":
      return response.valueNumeric ?? null;
    case "boolean":
      return response.valueBoolean ?? null;
    case "text":
      return response.valueText ?? null;
    case "multi_choice":
      return Array.isArray(response.rawPayloadJson)
        ? (response.rawPayloadJson as string[])
        : null;
    case "option":
      if (response.selectedOptionId && optionValueMap) {
        return optionValueMap.get(response.selectedOptionId) ?? null;
      }
      return null;
    default:
      return null;
  }
}

/**
 * Get the field name that contains the value (for debugging/logging)
 */
export function getValueFieldName(
  valueType: ResponseValueType | null | undefined,
): string {
  if (!valueType) return "unknown";

  switch (valueType) {
    case "numeric":
      return "valueNumeric";
    case "boolean":
      return "valueBoolean";
    case "text":
      return "valueText";
    case "option":
      return "selectedOptionId";
    case "multi_choice":
      return "rawPayloadJson";
    default:
      return "unknown";
  }
}
