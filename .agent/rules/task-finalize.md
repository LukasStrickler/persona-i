---
description: Ensure agents run the finalize command at the end of each session
alwaysApply: true
---

# Agent Finalization Rule

At the end of each agent session, you MUST execute `bun run agent:finalize` to verify code quality.

## What it does:

- TypeScript type checking (`typecheck`)
- ESLint linting (`lint`)
- Prettier format checking (`format:check`)
- Shows full error messages with file paths, line numbers, and context

## Critical:

- ❌ Do NOT mark task complete until `agent:finalize` passes
- ✅ Fix ALL errors before completing the session
- ✅ After passing, run `docs:check` separately if needed

## When to run:

- At the END of every agent session (mandatory)
- Before marking any task as complete
- After code changes that might introduce errors

## Error handling:

- Use `bun run format:write` to auto-fix formatting
- Use `bun run lint:fix` to auto-fix linting where possible
- Fix TypeScript errors manually (command shows exact locations)
