---
description: Fix PR comments interactively
---

# Fix PR Comments

Automatically process unresolved PR comments: investigate, fix, or dismiss them step by step.

## PR Number Detection & Validation

**⚠️ CRITICAL: Always ensure the correct PR is identified before processing comments.**

### How PR Detection Works

The system uses a multi-step approach to detect and validate the PR number:

1. **Detection Methods** (in priority order):
   - **Most recent PR comment file**: Checks `.github/pr-comments/` for the most recently modified metadata file
   - **Current commit SHA match**: Uses `gh pr list` to find PRs where `headRefOid` matches `git rev-parse HEAD` (reliable for GitButler)
   - **Current branch**: Falls back to `gh pr view` for the current branch (may not work with GitButler)

2. **Validation**:
   - Compares current commit SHA (`git rev-parse HEAD`) with PR's head commit SHA (`gh pr view --json headRefOid`)
   - Validates using three checks:
     - **Exact match**: Current commit equals PR head commit
     - **Ancestor check**: PR head is an ancestor of current commit (user is ahead, e.g., GitButler workspace commits)
     - **Reverse ancestor**: Current commit is an ancestor of PR head (user is behind)
   - If validation fails, the script explicitly states "❌ PR number NOT validated - do not use this PR number"

3. **Error Handling**:
   - If detection fails, scripts show clear error messages with suggestions
   - If validation fails, scripts exit with error code and suggest using `--no-validate` flag if needed
   - **Never proceed blindly** - always confirm PR number matches the workspace state

### Best Practices for Agents

- **Always validate**: Use `bun run pr:comments:detect` to detect and validate PR number before starting
- **Check output**: If validation fails, ask the user: "Detected PR #<NUMBER>, but it doesn't match the current commit (current: <SHA>, PR head: <SHA>). Is this correct?"
- **Use explicit PR numbers**: When PR number is shown in `pr:comments:get` output, use it explicitly in resolve/dismiss commands
- **Handle GitButler**: The validation handles GitButler workspace commits by checking ancestor relationships, not just exact matches

## Workflow

**Loop until all comments are resolved:**

1. **Get Comment**: `bun run pr:comments:get` (auto-detects PR, defaults to first unresolved comment)
2. **Investigate CRITICALLY**:
   - Read the actual code (not just the comment)
   - Check file context at specified line
   - Look for similar patterns in codebase
   - Verify the issue actually exists
   - Question if this is worth fixing
3. **Decide CAREFULLY**:
   - **Default to dismissing** unless you're confident it's a real issue
   - Ask: Is this actually a problem? Is it worth fixing? Is it bloat?
   - When in doubt, dismiss with clear reason
4. **Action**:
   - **Fix**: Make code change → `bun run agent:finalize` → `bun run pr:comments:resolve <PR_NUMBER> <COMMENT_ID>`
   - **Dismiss**: `bun run pr:comments:dismiss <PR_NUMBER> <COMMENT_ID> "<REASON>"`
5. **Repeat**: Comments auto-refresh after each action; use `pr:comments:get` without params to get next unresolved comment

**Completion**: When `pr:comments:get` shows "✅ All PR Comments Resolved" with statistics, the task is complete. Exit with success.

## Decision Criteria

**⚠️ CRITICAL: Be VIGILANT Against Bloat - Think Before Fixing**

**Before fixing ANY comment, ask yourself:**

1. **Is this actually a problem?** - Does the code actually have the issue described?
2. **Is this worth fixing?** - Will fixing this improve code quality, or is it just pedantic?
3. **Is this a false positive?** - Is the reviewer misunderstanding the code?
4. **Is this intentional?** - Is the "issue" actually by design?
5. **Will fixing this cause problems?** - Could the fix introduce bugs or complexity?
6. **Is this consistent with the codebase?** - Are similar patterns used elsewhere?

**Default to DISMISSING unless you're confident it's a real issue worth fixing.**

**Fix and Resolve** ONLY when:

- ✅ **Real bug or issue** that needs fixing (not just style/preference)
- ✅ **Fix is straightforward, safe, and improves code quality** (not just cosmetic)
- ✅ **Suggestion is correct** and aligns with best practices (not a misunderstanding)
- ✅ **Fix doesn't introduce new problems** (no risk of breaking things)
- ✅ **Issue has real impact** (not just minor style nitpicking)

**Dismiss** when:

- ❌ **Bloat/not worth fixing** - Minor style, overly pedantic, low impact, cosmetic changes
- ❌ **False positive** - Code is actually correct as-is, reviewer misunderstood
- ❌ **Intentional design** - Issue is by design, not a bug
- ❌ **Fix would introduce more problems** - Fixing would break things or add complexity
- ❌ **Suggestion is based on misunderstanding** - Reviewer doesn't understand the code
- ❌ **Inconsistent with codebase** - Similar patterns exist elsewhere and are fine
- ❌ **Style/preference only** - No functional impact, just different style
- ❌ **Overly pedantic** - Nitpicking that doesn't improve code quality

**⚠️ CRITICAL: Always verify the issue exists before fixing.**

- **Read the actual code** - Don't trust the comment blindly
- **Check the context** - Understand what the code is doing
- **Look for false positives** - Code might already be correct
- **Consider trade-offs** - Fix might introduce complexity or bugs
- **Review similar patterns** - Check if similar code exists elsewhere
- **Question the reviewer** - Is this suggestion actually correct?
- **When in doubt, dismiss** - Better to dismiss bloat than fix unnecessary things

## Commands

### Core Workflow Commands

- `bun run pr:comments:get` - Get first unresolved comment (auto-detects PR, defaults to index 1)
- `bun run pr:comments:get [PR_NUMBER] [INDEX_OR_ID]` - Get specific comment (PR auto-detects if omitted, index defaults to 1)
- `bun run pr:comments:resolve [PR_NUMBER] <COMMENT_ID>` - Resolve after fixing (PR number shown in comment details, or auto-detects)
- `bun run pr:comments:dismiss [PR_NUMBER] <COMMENT_ID> "<REASON>"` - Dismiss with reason (PR number shown in comment details, or auto-detects)

### Utility Commands

- `bun run pr:comments:detect` - Detect and validate PR number (`--no-validate` to skip validation)
- `bun run pr:comments [PR_NUMBER]` - Fetch all comments for PR (PR auto-detects if omitted)
- `bun run agent:finalize` - Verify code quality (MUST run before resolving after fixes)

## Important Notes

- **PR number is shown in comment details**: Use the PR number from `pr:comments:get` output when resolving/dismissing
- **Auto-detection**: All commands auto-detect PR number if omitted, but explicit PR numbers are preferred for clarity
- **Auto-refresh**: Comments automatically refresh after resolving/dismissing, so always use `pr:comments:get` without params to get the next one
- **One at a time**: Always process one comment at a time to avoid confusion
- **Verify fixes**: Always run `agent:finalize` before resolving to ensure code quality
- **Clear reasons**: Use clear, descriptive reasons when dismissing (e.g., "bloat", "false positive", "intentional design", "not applicable")
- **If PR detection fails**: Ask the user for the PR number instead of guessing
