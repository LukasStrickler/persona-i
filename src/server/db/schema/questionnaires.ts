import { sql } from "drizzle-orm";
import { text, integer, index } from "drizzle-orm/sqlite-core";
import { createTable } from "./_base";
import { questionType } from "./question_types";
import { user } from "./_auth";

/**
 * Questionnaire - logical container for a test
 */
export const questionnaire = createTable("questionnaire", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  title: text("title").notNull(),
  description: text("description"), // Short description for catalog
  isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(), // Whether shown on /tests page
  status: text("status", {
    mode: "text",
  }).notNull(), // "active", "hidden", "draft"
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Questionnaire version - immutable snapshot
 */
export const questionnaireVersion = createTable("questionnaire_version", {
  id: text("id").primaryKey(),
  questionnaireId: text("questionnaire_id")
    .notNull()
    .references(() => questionnaire.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
  metadataJson: text("metadata_json", { mode: "json" }), // Additional metadata
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

/**
 * Question bank item - reusable question catalog
 */
export const questionBankItem = createTable("question_bank_item", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // Unique identifier for the question
  prompt: text("prompt").notNull(), // The question text
  questionTypeCode: text("question_type_code")
    .notNull()
    .references(() => questionType.code, { onDelete: "restrict" }), // References questionType.code
  configJson: text("config_json", { mode: "json" }), // Type-specific config (validated against type's configSchema)
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Question option - answers for choice-based questions
 */
export const questionOption = createTable("question_option", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questionBankItem.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // Display text
  value: text("value").notNull(), // Value stored in response
  position: integer("position").notNull(), // Order of display
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

/**
 * Questionnaire item - links questions to questionnaire versions
 */
export const questionnaireItem = createTable("questionnaire_item", {
  id: text("id").primaryKey(),
  questionnaireVersionId: text("questionnaire_version_id")
    .notNull()
    .references(() => questionnaireVersion.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionBankItem.id, { onDelete: "cascade" }),
  position: integer("position").notNull(), // Order in questionnaire
  section: text("section"), // Optional section grouping
  isRequired: integer("is_required", { mode: "boolean" })
    .default(true)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

/**
 * User questionnaire access - m:n table for private test access
 */
export const userQuestionnaireAccess = createTable(
  "user_questionnaire_access",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionnaireId: text("questionnaire_id")
      .notNull()
      .references(() => questionnaire.id, { onDelete: "cascade" }),
    grantedAt: integer("granted_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
);

// Indexes for performance
export const questionnaireItemQuestionnaireVersionIdIdx = index(
  "questionnaire_item_questionnaire_version_id_idx",
).on(questionnaireItem.questionnaireVersionId);

// Composite index for finding active version by questionnaire (used in getMetaBySlug, getBySlug, etc.)
export const questionnaireVersionQuestionnaireIdIsActiveVersionIdx = index(
  "questionnaire_version_questionnaire_id_is_active_version_idx",
).on(
  questionnaireVersion.questionnaireId,
  questionnaireVersion.isActive,
  questionnaireVersion.version,
);
