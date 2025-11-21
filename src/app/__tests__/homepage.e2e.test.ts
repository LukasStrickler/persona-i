import { test, expect } from "@playwright/test";

/**
 * Base URL for e2e tests.
 * Playwright automatically starts the server via webServer config.
 * Use relative paths or the baseURL from config.
 */

test.describe("Homepage E2E", () => {
  test("should load the homepage successfully", async ({ page }) => {
    // Use relative path - baseURL is configured in playwright.config.ts
    await page.goto("/");
    const title = await page.title();
    expect(title).toContain("Persona");
  });

  test("should display the main header", async ({ page }) => {
    await page.goto("/");

    // Get the h1 that contains the hero text (not the logo h1)
    const mainHeading = page
      .getByRole("heading", { level: 1 })
      .filter({ hasText: "Compare your personality" });
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText("Compare your personality");
  });

  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");

    // The header has aria-label="Main navigation" but is a <header> element, not <nav>
    // So we use getByRole("banner") or locate by aria-label
    const navigation = page.getByRole("banner", { name: "Main navigation" });
    await expect(navigation).toBeVisible();

    // Check for at least one navigation link (Tests, Models, Benchmarks, or Documentation)
    // There are multiple "Tests" links (header and footer), so use first() to get one
    const testsLink = page.getByRole("link", { name: "Tests" }).first();
    await expect(testsLink).toBeVisible();
  });
});
