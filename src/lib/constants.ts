/**
 * Constants for the questionnaire access status
 * Note: Status codes 200 and 401 are internal status codes that may be logged
 * but are not displayed directly to users. They are used for internal tracking
 * and error handling purposes.
 */
export const questionnaireAccessStatusKV = {
  200: "Access granted", // Allowed (Internal status code, not displayed to user)
  401: "Authentication required - please login to access", // Unauthorized (Internal status code, not displayed to user)
  403: "You don't have permission to access this questionnaire!", // Forbidden
  404: "Questionnaire not found - please check your code!", // Not found
} as const;

/**
 * Type representing valid HTTP status codes for questionnaire access
 * Used for type-safe access to status messages
 */
export type QuestionnaireAccessStatus =
  keyof typeof questionnaireAccessStatusKV;
