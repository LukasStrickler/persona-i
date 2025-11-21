import { sql } from "drizzle-orm";
import { text, integer } from "drizzle-orm/sqlite-core";
import { createTable } from "./_base";

/**
 * Question type definitions stored in DB
 * References the TypeScript types in src/lib/types/question-types.ts
 */
export const questionType = createTable("question_type", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., "single_choice", "scalar"
  name: text("name").notNull(), // Display name, e.g., "Single Choice"
  description: text("description"), // Optional description
  componentName: text("component_name").notNull(), // React component reference
  configSchema: text("config_schema", { mode: "json" }), // JSON schema for validation
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});
