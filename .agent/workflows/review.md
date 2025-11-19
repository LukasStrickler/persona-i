---
description: Run CodeRabbit review (task or PR)
---

# CodeRabbit Review Command

Run CodeRabbit CLI to perform AI-powered code reviews for uncommitted changes (task review) or all changes differing from the main branch (PR review).

**Reference:** See `.cursor/rules/coderabbit-review.mdc` for detailed workflow and best practices.

## Usage

### Task Review (Uncommitted Files)

```bash
bun run review:task
```

or use the command:

```
/review task
```

Reviews all uncommitted changes in your working directory. Use this for:

- Quick feedback on work-in-progress
- Before committing changes locally
- Iterating on a feature or refactoring

### PR Review (All Files vs Main)

```bash
bun run review:pr
```

or use the command:

```
/review pr
```

Reviews all files that differ from the main branch (committed + uncommitted). Use this for:

- Before creating a Pull Request
- Comprehensive review of all changes vs main
- Before merging to main

## Read Review

```bash
bun run review:read
```

**Always use this command to read reviews** - it automatically finds the latest file and displays formatted output. Don't use file explorer for full reviews.

Reads the latest review (task or PR) from `.coderabbit/` directory and displays:

- Review type (task or PR) and timestamp
- Enhanced statistics (files reviewed, issue types, total issues, review duration)
- Issue types with counts (e.g., "Potential Issue: 66", "Refactor Suggestion: 3")
- Files reviewed (first 5, with count)
- Full review content

## Running Reviews

**⚠️ CRITICAL: When asked to run a review, you MUST:**

- ✅ **Actually execute** `bun run review:task` or `bun run review:pr` (never skip running the external review)
- ✅ **Wait for completion** - let the review run fully to completion (no timeouts, no early termination)
- ✅ **Then read** the review using `bun run review:read` after it completes
- ❌ **Never skip** running the external review itself unless explicitly told to skip it
- ❌ **Never timeout** or interrupt the review process - reviews can take several minutes

The review command will run CodeRabbit CLI which analyzes your code. This is an external process that must complete before reading results.

## Workflow

1. **Run Review:** Execute `bun run review:task` or `bun run review:pr` and **wait for it to complete**
2. **Read Review:** Use `bun run review:read` to see latest review with statistics and issue types
3. **Validate Issues:** **⚠️ CRITICAL:** Review each suggestion and validate it's actually an issue worth fixing
4. **Fix Issues:** Focus on high-priority issue types first (e.g., `potential_issue` before `refactor_suggestion`)
5. **Iterate:** Repeat steps 1-4 up to 3 times if needed
6. **Finalize:** Run `bun run agent:finalize` after fixes

## Review Files

- Reviews saved to: `.coderabbit/{type}-review-{timestamp}.md`
- Metadata with enhanced statistics saved to: `.coderabbit/{type}-review-{timestamp}.json`
- **Always use `bun run review:read` to read reviews** (automatically finds latest file)

## Enhanced Statistics

The review metadata includes comprehensive statistics:

- **Files reviewed**: Number of files analyzed
- **Issue types**: Number of unique issue types found
- **Total issues**: Total count of all issues
- **Review duration**: Time taken for the review (in seconds)

## Dynamic Issue Types

CodeRabbit dynamically detects and categorizes all issue types from the review:

- **Type detection**: Automatically extracts all unique issue types (e.g., `potential_issue`, `refactor_suggestion`)
- **Type counts**: Shows count for each issue type found
- **Formatted display**: Type names are formatted for readability (e.g., "Potential Issue", "Refactor Suggestion")

## Validation and Critical Thinking

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

## Best Practices

- ✅ **Validate first**: Review each suggestion critically before implementing
- ✅ Review statistics first to understand scope (files, types, total issues)
- ✅ Focus on high-count issue types first (e.g., if `potential_issue` has 66 items, start there)
- ✅ Use review duration to estimate future review times
- ✅ Limit iterations to 3 to avoid over-engineering
- ✅ Always run `agent:finalize` after applying fixes
- ✅ Check issue types to understand what needs attention

## Troubleshooting

- **CodeRabbit CLI not found:** Install with `npm install -g @coderabbitai/cli`
- **Too many files error:** Commit some files first or upgrade to Pro plan
- **No review files found:** Run a review first with `bun run review:task` or `bun run review:pr`
- **Authentication error:** Run `coderabbit auth login`
