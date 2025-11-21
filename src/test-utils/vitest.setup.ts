/**
 * Global test setup file.
 * Runs before all tests to configure the test environment.
 *
 * This file is executed once before all tests in the project.
 * For per-test setup, use beforeEach/afterEach hooks in individual test files.
 *
 * Note: Database setup is NOT done here automatically to avoid hanging.
 * Integration tests should call setupTestDb() in their beforeAll hooks.
 * This prevents unit tests from unnecessarily running database migrations.
 *
 * Top-level await is not supported in vitest setupFiles and can cause hangs.
 */

// This file can be used for global test configuration if needed
// For now, it's intentionally minimal to avoid performance issues
