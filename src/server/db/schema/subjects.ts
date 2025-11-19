import { sql } from "drizzle-orm";
import { text, integer, check, index } from "drizzle-orm/sqlite-core";
import { createTable } from "./_base";
import { user } from "./_auth";

/**
 * Subject type - only "human" or "llm" are allowed
 */
export type SubjectType = "human" | "llm";

/**
 * Subject profile - canonical record for any assessment actor
 * Only supports humans and LLM models
 */
export const subjectProfile = createTable(
  "subject_profile",
  {
    id: text("id").primaryKey(),
    subjectType: text("subject_type", { mode: "text" })
      .notNull()
      .$type<SubjectType>(), // Only "human" or "llm" allowed
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Nullable - LLM models don't have users
    displayName: text("display_name").notNull(), // e.g., "GPT-4", "John Doe"
    preferredLocale: text("preferred_locale"), // Optional locale
    metadataJson: text("metadata_json", { mode: "json" }), // e.g., model version, demographics
    consentFlagsJson: text("consent_flags_json", { mode: "json" }), // Consent tracking
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // Enforce subjectType constraint at database level - only "human" or "llm" allowed
    check("subject_type_check", sql`${table.subjectType} IN ('human', 'llm')`),
  ],
);

// Index for filtering by subjectType (used in getModelResponses, getAggregated)
// This is the most common query pattern, so prioritize this index
export const subjectProfileSubjectTypeIdx = index(
  "subject_profile_subject_type_idx",
).on(subjectProfile.subjectType);

// Composite index for finding user profile by userId and subjectType (used in getIncompleteSessions)
// Note: userId is nullable, but SQLite supports indexes on nullable columns
export const subjectProfileUserIdSubjectTypeIdx = index(
  "subject_profile_user_id_subject_type_idx",
).on(subjectProfile.userId, subjectProfile.subjectType);
