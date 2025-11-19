---
description: Check for documentation updates
---

# Check Documentation Updates

Run `bun run docs:check` to analyze git diff and identify code changes that may require documentation updates.

**Reference:** See `.docs/DOCUMENTATION_GUIDE.md` for best practices, structure, and examples.

## What it does:

- Compares current branch (committed + uncommitted) with main
- Categorizes changes by type (Database, API, Components, Config, etc.)
- Lists changed files in each category
- Provides universal guidance (works in any directory structure)

## Usage:

```bash
bun run docs:check
```

## When to run:

- ✅ After `agent:finalize` passes (run separately)
- ✅ Before creating a PR
- ✅ After significant code changes
- ✅ When updating schemas, APIs, or configuration

## Workflow:

1. Review categorized changes
2. Check `.docs/DOCUMENTATION_GUIDE.md` for best practices
3. Use exploratory file finding to locate relevant docs in `.docs/`
4. Update documentation following the guide's principles

## Documentation structure:

- Location: `.docs/` directory at repository root
- Review: `.docs/DOCUMENTATION_GUIDE.md` for structure and best practices
- Principles: focused, visual, updated, consistent, discoverable

## Note:

This command provides universal guidance without specifying exact files. The agent should determine which documentation needs updating based on the categorized changes and project structure.
