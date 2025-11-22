import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests.
 * These tests use Playwright's test API directly for full browser navigation.
 * The webServer configuration automatically starts and manages the Next.js dev server.
 *
 * Database isolation: Uses in-memory SQLite database.
 * Note: All workers share the same webServer instance, so they share the database.
 * Tests should be designed to be independent and clean up after themselves.
 */
export default defineConfig({
  testDir: "./src",
  testMatch: /.*\.e2e\.test\.ts$/,
  outputDir: ".test-results",
  // Disable parallel execution to ensure database isolation
  // The in-memory database is shared across workers, so tests must run sequentially
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Use list reporter for console output, html reporter for CI (but don't serve)
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: ".playwright-report", open: "never" }],
      ]
    : [["list"]], // Only use list reporter locally to avoid serving HTML report
  use: {
    baseURL: "http://localhost:5001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Automatically start Next.js dev server before tests on port 5001
  // This avoids conflicts with a potentially running dev server on port 3000
  webServer: {
    command: "bun run dev -p 5001",
    url: "http://localhost:5001",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes timeout for server startup
    stdout: "ignore",
    stderr: "pipe",
    env: {
      // Use in-memory database for E2E tests
      // Note: Tests run sequentially (workers: 1) to ensure database isolation
      // since in-memory SQLite with shared cache shares state across connections
      DATABASE_URL: "file::memory:",
      DATABASE_TOKEN: "test-token",
      NODE_ENV: "test",
      BETTER_AUTH_SECRET:
        "test-secret-minimum-32-characters-long-for-validation",
      RESEND_API_KEY: "test-resend-key",
      RESEND_FROM: "test@example.com",
      CONTACT_EMAIL: "test@example.com",
    },
  },
});
