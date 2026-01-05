import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Generates a unique database name for test isolation.
 * Uses a combination of timestamp and random string to ensure uniqueness.
 */
function generateUniqueDbName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `test_${timestamp}_${random}`;
}

/**
 * Gets the test database URL.
 * Defaults to in-memory SQLite if TEST_DATABASE_URL is not set.
 *
 * @returns Database URL string. Uses a unique temp file database for each test.
 */
export function getTestDatabaseUrl(): string {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (testDbUrl) {
    return testDbUrl;
  }

  // Unique temp file per test ensures isolation (libsql supports :memory: but not mode=memory param)
  const uniqueName = generateUniqueDbName();
  const tempPath = join(tmpdir(), `${uniqueName}.db`);
  return `file:${tempPath}`;
}

/**
 * Gets the test database auth token.
 * Returns empty string for in-memory/file-based SQLite.
 */
export function getTestDatabaseToken(): string {
  const testDbToken = process.env.TEST_DATABASE_TOKEN;
  return testDbToken ?? "";
}

/**
 * Checks if the database URL is an in-memory database.
 */
export function isInMemoryDb(url: string): boolean {
  return url === ":memory:" || url.includes(":memory:");
}

/**
 * Checks if the database URL is a file-based SQLite database.
 */
export function isFileBasedDb(url: string): boolean {
  return url.startsWith("file:") && !isInMemoryDb(url);
}

/**
 * Checks if the database URL is a remote database (Turso, etc.).
 */
export function isRemoteDb(url: string): boolean {
  return (
    url.startsWith("libsql://") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

/**
 * Determines if tests can run in parallel based on database type.
 * - Default (no TEST_DATABASE_URL): ✅ Parallel safe - each test gets a unique database name
 * - Explicit TEST_DATABASE_URL with shared cache: ❌ Sequential (shared state)
 * - File-based SQLite: ❌ Sequential (file locking)
 * - Remote DB: ❌ Sequential (shared resource)
 */
export function canRunTestsInParallel(): boolean {
  const explicitUrl = process.env.TEST_DATABASE_URL;

  // Default behavior: unique database per test = parallel safe
  if (!explicitUrl) {
    return true;
  }

  // Explicit URL with shared cache = shared state = sequential
  if (explicitUrl.includes("cache=shared")) {
    return false;
  }

  // Explicit in-memory without shared cache = parallel safe
  if (isInMemoryDb(explicitUrl)) {
    return true;
  }

  // File-based and remote databases = sequential
  return false;
}

/**
 * Gets database configuration for tests.
 */
export function getTestDbConfig() {
  const url = getTestDatabaseUrl();
  const token = getTestDatabaseToken();

  return {
    url,
    token,
    isInMemory: isInMemoryDb(url),
    isFileBased: isFileBasedDb(url),
    isRemote: isRemoteDb(url),
    canRunInParallel: canRunTestsInParallel(),
  };
}
