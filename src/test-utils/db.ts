import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";

import * as schema from "@/server/db/schema";
import { getTestDatabaseToken, getTestDatabaseUrl } from "./db-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../");

export type TestDatabase = LibSQLDatabase<typeof schema> & {
  $client: Client;
  $dbPath: string | null;
};

/**
 * Creates a fresh SQLite database for testing with migrations applied.
 * Each call returns a completely isolated database instance.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const url = getTestDatabaseUrl();
  const token = getTestDatabaseToken();

  const client = createClient({
    url,
    authToken: token || undefined,
  });

  const db = drizzle(client, { schema }) as TestDatabase;

  db.$client = client;
  // Extract file path from URL for cleanup (e.g., "file:/path/to/db" -> "/path/to/db")
  db.$dbPath = url.startsWith("file:") ? url.slice(5) : null;

  const migrationsPath = path.resolve(projectRoot, "src/server/db/_migrations");
  await migrate(db, { migrationsFolder: migrationsPath });

  return db;
}

/**
 * Closes the database client and cleans up temp files.
 * Must be called in afterEach to prevent resource leaks.
 */
export async function closeTestDatabase(db: TestDatabase): Promise<void> {
  db.$client.close();

  if (db.$dbPath) {
    try {
      await unlink(db.$dbPath);
    } catch {
      // File may already be deleted or never created
    }
  }
}
