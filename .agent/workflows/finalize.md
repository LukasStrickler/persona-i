---
description: Finalize session with code quality checks
---

# Finalize Session

Run `bun run agent:finalize` to perform final code quality checks before concluding the session.

## What it checks:

- TypeScript type checking (`typecheck`)
- ESLint linting (`lint`)
- Prettier format checking (`format:check`)
- Shows full error messages with file paths, line numbers, and context

## Usage:

```bash
bun run agent:finalize
```

## Auto-fix commands:

- `bun run format:write` - Auto-fix formatting issues
- `bun run lint:fix` - Auto-fix linting issues where possible

## Troubleshooting:

- **TypeScript errors**: Fix manually (command shows exact locations)
- **Linting errors**: Try `bun run lint:fix` first, then fix remaining manually
- **Formatting issues**: Run `bun run format:write` to auto-fix

## Next steps:

- ✅ Once `agent:finalize` passes, run `docs:check` separately if needed
- ✅ See `.docs/DOCUMENTATION_GUIDE.md` for documentation best practices
