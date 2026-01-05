import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@/server/db/schema";
import { getTestDatabaseToken, getTestDatabaseUrl } from "./db-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../");

export type TestDatabase = LibSQLDatabase<typeof schema> & { $client: Client };

/**
 * Creates a fresh in-memory SQLite database for testing.
 * Each call returns a completely isolated database instance with migrations already applied.
 *
 * **Isolation Pattern:**
 * - Uses `:memory:` (not `file::memory:`) for proper isolation
 * - Each call creates a NEW, isolated in-memory database
 * - Migrations are automatically applied before returning
 * - Use in `beforeEach` hook for complete test isolation
 *
 * **Usage:**
 * ```typescript
 * describe("My Tests", () => {
 *   let db: TestDatabase;
 *
 *   beforeEach(async () => {
 *     db = await createTestDatabase(); // Fresh DB with migrations applied
 *   });
 *
 *   it("should test something", async () => {
 *     // Use db here - it's a fresh, isolated database
 *   });
 * });
 * ```
 *
 * @returns A Drizzle database instance with migrations applied and client attached
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const url = getTestDatabaseUrl();
  const token = getTestDatabaseToken();

  // Use ":memory:" for proper isolation (matches isolated test pattern)
  const client = createClient({
    url,
    authToken: token || undefined,
  });

  const db = drizzle(client, { schema }) as TestDatabase;

  // Attach client to db for cleanup
  db.$client = client;

  // Run migrations to ensure schema is applied before returning
  const migrationsPath = path.resolve(projectRoot, "src/server/db/_migrations");
  await migrate(db, { migrationsFolder: migrationsPath });

  return db;
}

/**
 * Priority 3: Closes the underlying client for a test database instance.
 * Essential for preventing resource leaks in test suites.
 *
 * Recommended usage in tests:
 * ```ts
 * let db: TestDatabase;
 *
 * beforeEach(async () => {
 *   db = await createTestDatabase();
 * });
 *
 * afterEach(async () => {
 *   await closeTestDatabase(db);
 * });
 * ```
 */
export async function closeTestDatabase(db: TestDatabase): Promise<void> {
  db.$client.close();
}
