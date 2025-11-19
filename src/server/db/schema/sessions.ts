import { sql } from "drizzle-orm";
import { text, integer, index } from "drizzle-orm/sqlite-core";
import { createTable } from "./_base";
import { questionnaireVersion } from "./questionnaires";
import { subjectProfile } from "./subjects";
import { user } from "./_auth";
import { questionBankItem } from "./questionnaires";
import { questionOption } from "./questionnaires";

/**
 * Assessment session - a single run by a subject against a questionnaire version
 */
export const assessmentSession = createTable("assessment_session", {
  id: text("id").primaryKey(),
  questionnaireVersionId: text("questionnaire_version_id")
    .notNull()
    .references(() => questionnaireVersion.id, { onDelete: "cascade" }),
  subjectProfileId: text("subject_profile_id")
    .notNull()
    .references(() => subjectProfile.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Nullable for AI models
  status: text("status", {
    mode: "text",
  })
    .notNull()
    .default("in_progress"), // "in_progress", "completed", "abandoned"
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  metadataJson: text("metadata_json", { mode: "json" }), // Additional session metadata
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Response - atomic answer records (one per question per session)
 */
export const response = createTable("response", {
  id: text("id").primaryKey(),
  assessmentSessionId: text("assessment_session_id")
    .notNull()
    .references(() => assessmentSession.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionBankItem.id, { onDelete: "cascade" }),
  // Typed value columns (only one should be set based on question type)
  selectedOptionId: text("selected_option_id").references(
    () => questionOption.id,
    { onDelete: "set null" },
  ), // For single_choice
  valueNumeric: integer("value_numeric"), // For scalar
  valueBoolean: integer("value_boolean", { mode: "boolean" }), // For boolean
  valueText: text("value_text"), // For text
  rawPayloadJson: text("raw_payload_json", { mode: "json" }), // For extensibility
  // Indicates which field contains the actual value for easy client-side access
  valueType: text("value_type", {
    mode: "text",
  }), // "numeric" | "boolean" | "text" | "option" | "multi_choice"
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Indexes for performance
export const assessmentSessionQuestionnaireVersionIdIdx = index(
  "assessment_session_questionnaire_version_id_idx",
).on(assessmentSession.questionnaireVersionId);

export const assessmentSessionStatusIdx = index(
  "assessment_session_status_idx",
).on(assessmentSession.status);

export const assessmentSessionSubjectProfileIdIdx = index(
  "assessment_session_subject_profile_id_idx",
).on(assessmentSession.subjectProfileId);

// Composite index for finding model sessions by version, status, and subjectProfileId
// Used in getModelResponses and getAggregated
export const assessmentSessionVersionStatusSubjectIdx = index(
  "assessment_session_version_status_subject_idx",
).on(
  assessmentSession.questionnaireVersionId,
  assessmentSession.status,
  assessmentSession.subjectProfileId,
);

// Composite index for finding incomplete user sessions
// Used in getIncompleteSessions
export const assessmentSessionVersionSubjectStatusUserIdx = index(
  "assessment_session_version_subject_status_user_idx",
).on(
  assessmentSession.questionnaireVersionId,
  assessmentSession.subjectProfileId,
  assessmentSession.status,
  assessmentSession.userId,
);

export const responseAssessmentSessionIdIdx = index(
  "response_assessment_session_id_idx",
).on(response.assessmentSessionId);
