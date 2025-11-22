import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

import { playwright } from "@vitest/browser-playwright";

import { canRunTestsInParallel } from "./src/test-utils/db-config";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: process.env.COVERAGE_DIR ?? "./coverage",
      exclude: [
        "node_modules/",
        ".next/",
        "**/*.stories.tsx",
        "**/*.config.ts",
        "**/*.config.js",
        "**/__tests__/**",
        ".storybook/**",
        "scripts/**",
      ],
    },
    projects: [
      // Storybook tests project - tests stories in browser
      // Note: The Storybook plugin may show "No story files found" warnings when running
      // other projects (unit/integration/e2e). These are harmless informational messages
      // and don't affect test execution. They occur because Vitest loads all project
      // configurations at startup, causing the plugin to scan for stories.
      {
        resolve: {
          alias: {
            "@": path.resolve(dirname, "./src"),
          },
        },
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          // Note: This plugin scans for stories when Vitest loads configs, which may show
          // "No story files found" warnings when running other projects. These warnings are
          // harmless and don't affect test execution - they're just the plugin checking
          // the story patterns from .storybook/main.ts (components, app, stories directories).
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          include: [], // Storybook plugin will populate this automatically
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
      // Unit tests project - minimal setup
      {
        resolve: {
          alias: {
            "@": path.resolve(dirname, "src"),
          },
        },
        test: {
          name: "unit",
          include: ["**/__tests__/**/*.unit.test.ts"],
          environment: "node", // Use node for now, add jsdom later if needed for React components
          // No setup files - keep it simple
        },
      },
      // Integration tests project - database tests
      {
        resolve: {
          alias: {
            "@": path.resolve(dirname, "src"),
          },
        },
        test: {
          name: "integration",
          include: ["**/__tests__/**/*.integration.test.ts"],
          environment: "node",
          // Dynamic parallel execution based on database type
          // In-memory DB: parallel (threads)
          // Real DB: serialized (forks with maxConcurrency 1)
          pool: canRunTestsInParallel() ? "threads" : "forks",
          maxConcurrency: canRunTestsInParallel() ? undefined : 1,
          // Database setup is done in test files via beforeAll hooks
        },
      },
      // E2E tests are handled by Playwright directly (not Vitest browser mode)
      // See playwright.config.ts for E2E test configuration
      // Vitest browser mode is for component testing, not E2E navigation
    ],
  },
});
