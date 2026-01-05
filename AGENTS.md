# Persona[i] Agent Handbook

**Generated:** 2026-01-05 | **Commit:** b38d875

Personality benchmarking platform. Users take assessments, compare with LLM model profiles.

## STACK

Next.js 16 (App Router) · React 19 · tRPC · Drizzle ORM · Turso/LibSQL · Tailwind · Shadcn/UI · BetterAuth · Bun

## STRUCTURE

```
persona-questionnaire/
├── src/
│   ├── app/                    # Next.js pages (shared-background route group)
│   ├── components/             # UI + landing + test-taking + analysis
│   ├── server/                 # tRPC routers + db schema/queries
│   ├── stores/                 # Zustand analysis store + selectors
│   ├── hooks/                  # Data orchestration and saving
│   ├── lib/                    # Utils, auth, types, trpc client
│   └── emails/                 # React Email templates
├── .docs/                      # API/DB/architecture/workflow docs
└── scripts/                    # Helper scripts (don't edit)
```

## WHERE TO LOOK

| Task             | Location                        | Entry Point               |
| ---------------- | ------------------------------- | ------------------------- |
| URL/routing      | `src/app/(shared-background)/`  | `page.tsx` files          |
| Route handlers   | `src/app/api/`                  | `route.ts` files          |
| API endpoints    | `src/server/api/routers/`       | `questionnaires.ts`       |
| Database schema  | `src/server/db/schema/`         | `index.ts`                |
| Query logic      | `src/server/db/queries/`        | `questionnaires.ts`       |
| Test taking      | `src/components/test-taking/`   | `TestTakingClient.tsx`    |
| Analysis views   | `src/components/test-analysis/` | `TestAnalysisClient.tsx`  |
| State management | `src/stores/`                   | `useTestAnalysisStore.ts` |
| Documentation    | `.docs/`                        | `DOCUMENTATION_GUIDE.md`  |

## CODE MAP

| Symbol                    | Type      | Location                                      | Role                                 |
| ------------------------- | --------- | --------------------------------------------- | ------------------------------------ |
| `questionnairesRouter`    | tRPC      | `server/api/routers/questionnaires.ts`        | Sessions, responses, completion      |
| `responsesRouter`         | tRPC      | `server/api/routers/responses.ts`             | Aggregated responses, model data     |
| `createTestAnalysisStore` | Zustand   | `stores/useTestAnalysisStore.ts`              | Per-slug store factory (1379 lines)  |
| `useTestAnalysisData`     | Hook      | `hooks/useTestAnalysisData.ts`                | Multi-cache loader (683 lines)       |
| `TestTakingClient`        | Component | `components/test-taking/TestTakingClient.tsx` | Test-taking orchestrator (789 lines) |
| `useSaveResponse`         | Hook      | `hooks/useSaveResponse.ts`                    | Debounced response saving            |
| `useTestCompletion`       | Hook      | `hooks/useTestCompletion.ts`                  | Batch save + completion              |
| `cn`                      | Utility   | `lib/utils.ts`                                | Tailwind class merging               |

## CONVENTIONS

- `src/components/ui/`: kebab-case filenames.
- Other components: PascalCase.
- Hooks: camelCase.
- Tests: `*.unit.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts` (colocated in `__tests__`).
- Exports: components/pages default, hooks/utilities/routers named.
- Types: `interface` for objects, `type` for unions, no `any`.
- Imports order: React/Next.js → external → `@/` → relative → type imports.

## UNIQUE PATTERNS

- Per-slug store factory: `createTestAnalysisStore(slug)` returns cached instance.
- Subject-based architecture: `subjectType` ("model" | "human") + `subjectId`.
- Multi-cache data: React Query + Zustand store with targeted invalidation.
- Response saving: 500ms debounce, batch save on completion, sendBeacon fallback on unload.
- Selector memoization: ref-cached arrays + shallow compare to avoid re-renders/infinite loops.
- Question configs validated at runtime with Zod (QuestionRenderer).

## COMMANDS

```bash
bun run ci:setup
bun run dev
bun run storybook
bun run check
bun run agent:finalize
bun run docs:check
bun run test:unit
bun run test:integration
bun run test:e2e
```

## ANTI-PATTERNS (THIS PROJECT)

### Never Do

- Skip `bun run agent:finalize` before completing task.
- Use `any` type (use `unknown` + guards).
- Bypass Zod validation in tRPC routers.
- Put business logic in schema files.
- Mutate Zustand state directly (use Immer).
- Create duplicate stores (use `createTestAnalysisStore(slug)`).
- Push to remote repositories.
- Modify `.env` with real credentials.
- Delete/modify `.git/`.

### Avoid

- Broad refactors (prefer small, reversible changes).
- New dependencies without strong justification.
- Moving/renaming files just for style.
- Relying on real external services (treat env as placeholders).

## REFERENCE IMPLEMENTATIONS

| Pattern            | File                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| UI component       | `src/components/ui/form.tsx`                                          |
| Storybook story    | `src/components/ui/background-beams.stories.tsx`                      |
| tRPC router        | `src/server/api/routers/questionnaires.ts`                            |
| Zustand store      | `src/stores/useTestAnalysisStore.ts`                                  |
| Custom hook        | `src/hooks/useTestCompletion.ts`                                      |
| Unit test          | `src/hooks/__tests__/useTestCompletion.unit.test.ts`                  |
| Integration test   | `src/server/api/routers/__tests__/questionnaires.integration.test.ts` |
| Question component | `src/components/test-taking/questions/MultiChoiceQuestion.tsx`        |

## WORKFLOW

1. Read: skim relevant `.docs/` for domain context.
2. Find: UI in `src/app` + `src/components`, data in `src/server` + `src/stores`.
3. Change: smallest change, reuse existing patterns.
4. Validate: `bun run agent:finalize`, then `bun run docs:check` if behavior changed.

## GIT CONVENTIONS

- Branches: `feat/`, `fix/`, `docs/`, `refactor/`, `test/` + short description.
- Commits: conventional (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`); commit only when explicitly asked.

## NOTES

- `(shared-background)` route group applies shared layout across most pages.
- Large complexity hotspots: `useTestAnalysisStore.ts`, `useTestAnalysisData.ts`, `TestTakingClient.tsx`.
