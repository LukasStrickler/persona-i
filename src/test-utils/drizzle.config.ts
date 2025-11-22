import { type Config } from "drizzle-kit";

import { getTestDatabaseUrl } from "./db-config";

/**
 * Drizzle configuration for tests.
 * Uses in-memory SQLite by default, can be overridden via TEST_DATABASE_URL.
 * Note: For in-memory SQLite, we use "sqlite" dialect which doesn't support authToken.
 * For remote databases (Turso), use the main drizzle.config.ts instead.
 */
export default {
  schema: "./src/server/db/schema/index.ts",
  dialect: "sqlite",
  out: "./src/server/db/_migrations",
  dbCredentials: {
    url: getTestDatabaseUrl(),
  },
  tablesFilter: ["persona-questionnaire_*"],
} satisfies Config;
