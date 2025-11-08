/**
 * Constants for the questionnaire access status
 */
export const questionnaireAccessStatusKV = {
  200: "Access granted", // Allowed (Never shown to user)
  401: "Authentication required - please login to access", // Unauthorized (Never shown to user)
  403: "You don't have permission to access this questionnaire!", // Forbidden
  404: "Questionnaire not found - please check your code!", // Not found
} as const;

/**
 * Type representing valid HTTP status codes for questionnaire access
 * Used for type-safe access to status messages
 */
export type QuestionnaireAccessStatus =
  keyof typeof questionnaireAccessStatusKV;
