/**
 * Unified database configuration for tests.
 * Automatically detects database type and determines parallel execution capability.
 */

/**
 * Gets the test database URL.
 * Defaults to in-memory SQLite if TEST_DATABASE_URL is not set.
 */
export function getTestDatabaseUrl(): string {
  // Check if TEST_DATABASE_URL is explicitly set
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (testDbUrl) {
    return testDbUrl;
  }

  // Default to in-memory SQLite with shared cache for parallel connections
  return "file::memory:";
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
  return (
    url === ":memory:" ||
    url.includes(":memory:") ||
    url.includes("file::memory:")
  );
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
 * - In-memory DB without shared cache: ✅ Can run in parallel (isolated per connection)
 * - In-memory DB with shared cache: ❌ Must run sequentially (shared state across connections)
 * - File-based SQLite: ❌ Must run sequentially (file locking)
 * - Remote DB: ❌ Must run sequentially (shared resource)
 */
export function canRunTestsInParallel(): boolean {
  const dbUrl = getTestDatabaseUrl();

  // In-memory databases with shared cache cannot run in parallel
  if (isInMemoryDb(dbUrl) && dbUrl.includes("cache=shared")) {
    return false;
  }

  // In-memory databases without shared cache can run in parallel
  if (isInMemoryDb(dbUrl)) {
    return true;
  }

  // File-based and remote databases cannot run in parallel
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
