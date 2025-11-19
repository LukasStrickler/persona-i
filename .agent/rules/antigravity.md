---
description: Antigravity Agent Rules
alwaysApply: true
---

# Antigravity Agent Rules

These rules are specific to the Antigravity agent to ensure it follows project conventions.

## Workflow Awareness

- **Workflows**: Always check `.agent/workflows` for executable workflows before proposing manual steps.
- **Cursor Rules**: Respect rules defined in `.cursor/rules` (and duplicated in `.agent/rules`).

## Command Execution

- When asked to run a "review", "finalize", or "docs update", use the corresponding workflow in `.agent/workflows`.
- Prefer `bun run` commands defined in `package.json` or workflows over raw commands.
