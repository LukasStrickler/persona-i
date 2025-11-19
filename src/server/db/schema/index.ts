import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { createTable } from "./_base";

// Example model schema (keeping for backward compatibility)
export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

// Re-export auth tables for convenience
export * from "./_auth";

// Re-export questionnaire schema tables
export * from "./question_types";
export * from "./questionnaires";
export * from "./subjects";
export * from "./sessions";

// Re-export indexes
export {
  assessmentSessionQuestionnaireVersionIdIdx,
  assessmentSessionStatusIdx,
  assessmentSessionSubjectProfileIdIdx,
  assessmentSessionVersionStatusSubjectIdx,
  assessmentSessionVersionSubjectStatusUserIdx,
  responseAssessmentSessionIdIdx,
} from "./sessions";
export {
  questionnaireItemQuestionnaireVersionIdIdx,
  questionnaireVersionQuestionnaireIdIsActiveVersionIdx,
} from "./questionnaires";
export {
  subjectProfileUserIdSubjectTypeIdx,
  subjectProfileSubjectTypeIdx,
} from "./subjects";
