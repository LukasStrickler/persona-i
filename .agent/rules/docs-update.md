---
description: Ensure documentation is updated when code changes
alwaysApply: true
---

# Documentation Update Rule

When making code changes, ensure documentation is updated accordingly.

**Reference:** See `.docs/DOCUMENTATION_GUIDE.md` for best practices, structure, and examples.

## Workflow:

1. Run `agent:finalize` first (verify code quality)
2. **Use `/docs-check` skill** to check documentation needs (review categorized changes)
3. Use exploratory file finding to locate relevant docs in `.docs/`
4. Update documentation following the guide's principles

## When to update (decision criteria):

- ✅ **Schema/Database** → Update schema docs, ER diagrams (`.docs/db/`)
- ✅ **API** → Update endpoints, workflows, auth docs (`.docs/api/`)
- ✅ **Component/UI** → Update feature docs, UI guides
- ✅ **Config** → Update setup, env vars, deployment docs
- ✅ **Auth/Security** → Update security, access control docs
- ✅ **Breaking changes** → Always document prominently
- ❌ **Minor refactoring** → Usually skip (internal changes)

## PR checklist:

- [ ] `agent:finalize` passed
- [ ] Documentation check reviewed (using `/docs-check` skill)
- [ ] Relevant docs updated in `.docs/`
- [ ] PlantUML diagrams updated (if schemas/workflows changed)
- [ ] Cross-references added between related docs

## Best practices:

- ✅ **Focused**: Document what's necessary
- ✅ **Visual**: Use PlantUML for complex concepts
- ✅ **Updated**: Keep docs in sync with code
- ✅ **Consistent**: Follow project conventions
- ✅ **Discoverable**: Clear names, cross-references
