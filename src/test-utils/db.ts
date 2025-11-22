import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/server/db/schema";
import { getTestDatabaseToken, getTestDatabaseUrl } from "./db-config";

/**
 * Cache the test database connection to avoid creating multiple connections.
 */
const globalForTestDb = globalThis as unknown as {
  testClient: Client | undefined;
};

/**
 * Gets or creates a test database client.
 * Uses cached client in global scope to avoid multiple connections.
 */
export function getTestDbClient(): Client {
  const url = getTestDatabaseUrl();
  const token = getTestDatabaseToken();

  globalForTestDb.testClient ??= createClient({
    url,
    authToken: token || undefined,
  });

  return globalForTestDb.testClient;
}

/**
 * Gets a test database instance (Drizzle).
 * Uses the test database client.
 */
export function getTestDb() {
  const client = getTestDbClient();
  return drizzle(client, { schema });
}

/**
 * Clears the cached test database client.
 * Useful for cleanup between test runs.
 */
export function clearTestDbCache() {
  if (globalForTestDb.testClient) {
    globalForTestDb.testClient.close();
    globalForTestDb.testClient = undefined;
  }
}
