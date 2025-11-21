---
name: repo-agent
description: Helps build Persona[i] safely and quickly
---

# Persona[i] Agent Handbook

You are a focused contributor to this repo. Default to being specific, careful, and minimal in your changes.

## 1. Role & mindset

- Understand the feature and the user flow before you touch code.
- Prefer small, reversible changes over broad refactors.
- Keep behavior, tests, and docs in sync; don’t “just make it pass”.
- Assume environment variables and external services are **placeholders** (no real email, auth, or production DB).

## 2. Core commands

Use these by default:

- `bun run ci:setup` – first run in a new workspace; prepares `.env` and installs dependencies.
- `bun run dev` – run the app for end-to-end flows.
- `bun run storybook` – run Storybook for component and visual work.
- `bun run check` – quick ESLint + TypeScript check while iterating.
- `bun run agent:finalize` – **required before you consider a task done** (typecheck, lint, format, markdown).
- `bun run docs:check` – after behavior changes to see which docs likely need updates.

If a command fails, read its error output first; don’t guess. Re-run `ci:setup` if the environment looks broken.

## 3. Where to look (high-level map)

Don’t memorize exact files; use this as a compass:

- `src/app` – Next.js routes, layouts, and pages. When a URL or page is mentioned, start here.
- `src/components` – React components (UI building blocks, landing page sections, test-taking UI).
- `src/server` – tRPC routers, database schema, and server-side utilities.
- `src/stores` – client-side state (e.g., analysis, questionnaires, or UI state).
- `.docs` – all project documentation:
  - `api/` for API behavior.
  - `db/` for schema and migrations.
  - `workflow/` for user-flow and interaction patterns.
  - `architecture/` for higher-level system and data-flow docs.
- `scripts` – helper scripts used by the commands above (do not call these directly or edit them).

When you’re unsure where something should live, look at similar existing features and follow those patterns.

## 4. How to work on tasks

### 4.1 General workflow

1. **Read first**
   - Read the ticket or prompt carefully.
   - Skim the relevant docs under `.docs/` (workflow, architecture, api, or db) that match the area you’re touching.
2. **Find the code**
   - For UI: search in `src/app` and `src/components`.
   - For data/logic: search in `src/server` and `src/stores`.
3. **Change carefully**
   - Make the smallest change that solves the problem.
   - Reuse existing helpers and patterns when possible.
   - Investigate the codebase for already existing functionality that can be reused.
4. **Validate**
   - Use Storybook for component/visual work.
   - Add or update tests where it makes sense.
5. **Finish clean**
   - Run `bun run agent:finalize` and fix all reported issues.
   - Run `bun run docs:check` if new functionality was added or existing functionality was changed, then adjust the relevant documentation.

### 4.2 UI and UX work

When you change how something looks or behaves on screen:

- Implement or update the component in `src/components` or the relevant route in `src/app`.
- Add or extend a Storybook story next to the component (a `*.stories.tsx` file in the same folder).
- Use `bun run storybook` and:
  - Verify default, loading, error, and “empty” states where applicable.
  - Check keyboard navigation and focus behavior, especially for anything in the test-taking flow.
- Prefer using existing UI primitives from `src/components/ui` and the design tokens from `src/styles/globals.css`.

### 4.3 Behavior, data, and API work

When you change how data flows (saving responses, loading questionnaires, analysis, etc.):

- Find the relevant tRPC router in `src/server/api/routers` and the related schema in `src/server/db`.
- Keep types consistent: validate inputs with Zod in routers, and don’t bypass schemas.
- For client-side state or analysis, look in `src/stores` and related hooks/components.
- Before large changes, skim the matching docs under `.docs/architecture` and `.docs/db` so you don’t contradict existing design decisions.

### 4.4 Documentation work

When behavior, data, or flows change in a meaningful way:

- Use `.docs/DOCUMENTATION_GUIDE.md` for style and structure.
- Create a new doc if none exists for the relevant area, or choose the most relevant doc in `.docs/` (architecture, workflow, api, db) and update it:
  - Explain what changed and why.
  - Update or add diagrams when workflows or schemas change.
  - Link to related docs where it helps discovery.
- Look at existing docs for examples, structure, and related documentation.
- Keep docs focused and concise; don’t restate the entire codebase.

## 5. Validating your changes

### 5.1 UI validation (Storybook)

- Run `bun run storybook`.
- For each affected component:
  - Ensure there is at least one story that represents the new behavior.
  - Exercise different props and states via Storybook controls (args).
  - Check keyboard interaction and focus styles.
- Use Storybook to quickly review visual regressions before relying on full-app testing.

### 5.2 Tests

- Run `bun run test:all` to execute all tests. (`bun run test:unit`, `bun run test:integration`, `bun run test:e2e`)
- Prefer tests for logic that's easy to isolate:
  - Pure utility functions.
  - Data mapping, validation, and store behavior.
  - Non-trivial component behavior (e.g., keyboard navigation).
- Map out edge cases and add tests for them.
- Keep tests close to what they cover (same folder or a nearby `__tests__` folder).
- **Unit and Integration Tests**: Use Vitest (`*.unit.test.ts`, `*.integration.test.ts`). Structure tests so they can run under the existing Vitest configuration.
- **E2E Tests**: Use Playwright's test API directly (`*.e2e.test.ts`). These use `import { test, expect } from "playwright/test"` and are configured via `playwright.config.ts`. Test results are stored in `.test-results/` (gitignored).
- After adding tests, re-run `bun run agent:finalize`.

## 6. Do / Don't

### Do

- Use existing patterns and docs as the starting point.
- Keep questionnaire flows accessible (keyboard and screen-reader friendly).
- Update docs when behavior or data flows change.
- Keep changes as small and focused as possible.
- Think from the perspective of a user taking a test or comparing models.

### Don't

- Don’t skip `bun run agent:finalize` before you consider a task finished.
- Don’t introduce new dependencies without a strong reason.
- Don’t move files or rename things just for style; keep diffs meaningful.
- Don’t rely on real external services; treat env values as non-functional placeholders.

## 7. Quick troubleshooting

- **Setup issues**: re-run `bun run ci:setup`; check `.env` and ensure Bun is installed.
- **Storybook issues**: confirm `globals.css` is imported and that stories use the same components as the app.
- **Type/lint/format issues**: run `bun run format:write` and `bun run lint:fix`, then `bun run check` for remaining diagnostics.

When in doubt, look for an existing, similar feature and mirror how it is structured, tested, and documented. That will usually be closer to the intended architecture than inventing a new pattern.
