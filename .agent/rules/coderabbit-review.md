---
description: Use CodeRabbit for targeted code reviews after implementations
alwaysApply: true
---

# CodeRabbit Review Rule

Use CodeRabbit CLI for targeted, iterative code reviews after significant implementations.

**Reference:** See `.docs/DOCUMENTATION_GUIDE.md` for documentation best practices.

## When to run reviews:

- ✅ After big implementations or feature additions
- ✅ Before creating PRs (use PR review)
- ✅ After significant uncommitted changes (use task review)
- ❌ Don't run for minor changes or refactoring

## Review types:

- **Task review** (`bun run review:task`): Reviews uncommitted files in working directory (includes both staged and unstaged)
- **PR review** (`bun run review:pr`): Reviews all files differing from main branch (committed + uncommitted)

## Running reviews:

**⚠️ CRITICAL: When asked to run a review, you MUST:**

- ✅ **Actually execute** `bun run review:task` or `bun run review:pr` (never skip running the external review)
- ✅ **Wait for completion** - let the review run fully to completion (no timeouts, no early termination)
- ✅ **Then read** the review using `bun run review:read` after it completes
- ❌ **Never skip** running the external review itself unless explicitly told to skip it
- ❌ **Never timeout** or interrupt the review process - reviews can take several minutes

The review command will run CodeRabbit CLI which analyzes your code. This is an external process that must complete before reading results.

## Iterative workflow:

1. **Run Review:** Execute `bun run review:task` or `bun run review:pr` and **wait for it to complete**
2. **Read Review:** **Always use `bun run review:read`** to see latest review with statistics and issue types (don't use file explorer)
3. **Fix Issues:** Focus on high-priority issue types first (e.g., `potential_issue` before `refactor_suggestion`)
4. **Iterate:** Repeat steps 1-3 up to 3 times if needed to refine code
5. **Finalize:** Run `bun run agent:finalize` after fixes to ensure code quality

## Review output:

- Reviews saved to `.coderabbit/{type}-review-{timestamp}.md`
- Metadata with enhanced statistics saved to `.coderabbit/{type}-review-{timestamp}.json`
- **Always use `bun run review:read` to read reviews** (automatically finds the latest file and displays formatted output)

## Enhanced statistics:

The review metadata includes comprehensive statistics:

- **Files reviewed**: Number of files analyzed
- **Issue types**: Number of unique issue types found
- **Total issues**: Total count of all issues
- **Review duration**: Time taken for the review (in seconds)

## Dynamic issue types:

CodeRabbit dynamically detects and categorizes all issue types from the review:

- **Type detection**: Automatically extracts all unique issue types (e.g., `potential_issue`, `refactor_suggestion`)
- **Type counts**: Shows count for each issue type found
- **Formatted display**: Type names are formatted for readability (e.g., "Potential Issue", "Refactor Suggestion")

## Issue prioritization:

Use the issue types to prioritize fixes:

- **`potential_issue`**: Should fix (medium-high severity) - address these first
- **`refactor_suggestion`**: Consider fixing (medium severity) - improve code quality
- **Other types**: Review on a case-by-case basis based on context

The statistics help you understand the scope and prioritize fixes effectively.

## Validation and critical thinking:

**⚠️ IMPORTANT: Do NOT blindly fix every suggestion from the reviewer.**

Before applying any fix, validate that it's actually an issue worth fixing:

- ✅ **Verify the issue exists**: Check if the reported problem is real and not a misunderstanding
- ✅ **Understand the context**: Review the code in context to ensure the suggestion makes sense
- ✅ **Check for false positives**: Some suggestions may be incorrect or based on incomplete understanding
- ✅ **Consider trade-offs**: Evaluate if fixing the issue introduces other problems or complexity
- ✅ **Question assumptions**: Don't assume the reviewer is always correct - validate their understanding
- ✅ **Review intent**: Ensure the suggested fix aligns with the code's intended behavior
- ❌ **Don't fix**: If the suggestion is based on a misunderstanding or would break existing functionality
- ❌ **Don't fix**: If the "issue" is actually intentional design or a valid pattern for your use case
- ❌ **Don't fix**: If the fix would introduce more problems than it solves

**Always think critically** before applying changes. The reviewer provides suggestions, not mandates.

## Best practices:

- ✅ **Validate first**: Review each suggestion critically before implementing
- ✅ Review statistics first to understand scope (files, types, total issues)
- ✅ Focus on high-count issue types first (e.g., if `potential_issue` has 66 items, start there)
- ✅ Use review duration to estimate future review times
- ✅ Limit iterations to 3 to avoid over-engineering
- ✅ Always run `agent:finalize` after applying fixes
- ✅ Check issue types to understand what needs attention
- ✅ Consult `.docs/DOCUMENTATION_GUIDE.md` if review suggests doc updates

## Troubleshooting:

- **CodeRabbit CLI not found:** Install with `npm install -g @coderabbitai/cli`
- **Rate limit exceeded:** Wait for the specified time (usually 5-10 minutes) before retrying
- **Too many files error:** Commit some files first or upgrade to Pro plan (100 file limit)
- **No review files found:** Run a review first with `bun run review:task` or `bun run review:pr`
- **Authentication error:** Run `coderabbit auth login`
- **Metadata file not found:** Review may have failed - check the review markdown file for errors
