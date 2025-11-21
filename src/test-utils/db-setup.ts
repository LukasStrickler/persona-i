import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { sql } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@/server/db/schema";
import { getTestDbClient } from "./db";
import {
  getTestDatabaseUrl,
  isInMemoryDb,
  isFileBasedDb,
  isRemoteDb,
} from "./db-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sets up the test database by running migrations.
 * For in-memory databases, migrations are run fresh each time.
 * For file-based databases, migrations are only run if the database is new.
 */
export async function setupTestDb() {
  const client = getTestDbClient();
  const db = drizzle(client, { schema });

  const migrationsPath = path.join(__dirname, "../server/db/_migrations");

  try {
    await migrate(db, {
      migrationsFolder: migrationsPath,
    });
  } catch (error) {
    // Fail fast on all migration errors to catch real issues
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Tears down the test database.
 * For in-memory databases, this closes the connection.
 * For file-based databases, this closes the connection and optionally removes the file.
 */
export async function teardownTestDb() {
  const client = getTestDbClient();
  if (client) {
    try {
      client.close();
    } catch (error) {
      console.error("Error closing test database client:", error);
      // Re-throw to surface the error
      throw error;
    }
  }
}

/**
 * Clears all data from the test database.
 * Useful for ensuring clean state between tests.
 */
export async function clearTestDb() {
  const dbUrl = getTestDatabaseUrl();
  const client = getTestDbClient();
  const db = drizzle(client, { schema });

  // For in-memory databases, just recreate the connection
  if (isInMemoryDb(dbUrl)) {
    client.close();
    // The next call to getTestDbClient() will create a fresh connection
    return;
  }

  // For file-based or remote databases, clear all tables
  if (isFileBasedDb(dbUrl) || isRemoteDb(dbUrl)) {
    try {
      // Get all table names from the database
      const tablesResult = await db.run(sql`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_drizzle%'
      `);

      const tables = tablesResult.rows.map(
        (row) => (row as unknown as { name: string }).name,
      );

      if (tables.length === 0) {
        return;
      }

      // Disable foreign key checks
      await db.run(sql`PRAGMA foreign_keys = OFF`);

      // Delete all rows from each table
      // Use a transaction to ensure atomicity
      for (const table of tables) {
        try {
          const tableName = table.replace(/"/g, '""');
          await db.run(sql.raw(`DELETE FROM "${tableName}"`));
        } catch (error) {
          console.error(`Error clearing table ${table}:`, error);
          // Re-enable foreign keys before re-throwing
          await db.run(sql`PRAGMA foreign_keys = ON`);
          throw error;
        }
      }

      // Re-enable foreign key checks
      await db.run(sql`PRAGMA foreign_keys = ON`);
    } catch (error) {
      console.error("Error clearing test database:", error);
      throw error;
    }
  }
}
