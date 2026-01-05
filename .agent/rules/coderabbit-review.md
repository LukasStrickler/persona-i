---
description: Use CodeRabbit for targeted code reviews after implementations
alwaysApply: true
---

# CodeRabbit Review Rule

Use CodeRabbit CLI for targeted, iterative code reviews after significant implementations.

**Reference:** See `.docs/DOCUMENTATION_GUIDE.md` for documentation best practices.

## When to run reviews:

- ✅ After big implementations or feature additions
- ✅ Before creating PRs (use pr mode)
- ✅ After significant uncommitted changes (use task mode)
- ❌ Don't run for minor changes or refactoring

## Review types:

- **Task review** (`/code-review` in task mode): Reviews uncommitted files in working directory (includes both staged and unstaged)
- **PR review** (`/code-review` in pr mode): Reviews all files differing from main branch (committed + uncommitted)

## Running reviews:

**⚠️ CRITICAL: When asked to run a review, you MUST:**

- ✅ **Actually invoke** `/code-review` skill with appropriate mode (task or pr)
- ✅ **Wait for completion** - let the review run fully to completion (no timeouts, no early termination)
- ✅ **Review output** - The skill returns formatted review results directly
- ❌ **Never skip** invoking the skill unless explicitly told to skip it
- ❌ **Never timeout** or interrupt the review process - reviews can take several minutes

The `/code-review` skill provides the same functionality as the previous `review-*.sh` scripts and automatically handles:

- Running CodeRabbit CLI analysis
- Formatting output with comprehensive statistics
- Issue type categorization

## Iterative workflow:

1. **Run Review:** Invoke `/code-review` skill with appropriate mode (task or pr)
2. **Review Output:** The skill returns formatted review results with statistics and issue types
3. **Fix Issues:** Focus on high-priority issue types first (e.g., `potential_issue` before `refactor_suggestion`)
4. **Iterate:** Repeat steps 1-3 up to 3 times if needed to refine code
5. **Finalize:** Run `bun run agent:finalize` after fixes to ensure code quality

## Review output:

The `/code-review` skill automatically:

- Saves reviews to `.coderabbit/{type}-review-{timestamp}.md`
- Saves metadata with enhanced statistics to `.coderabbit/{type}-review-{timestamp}.json`
- Returns formatted review results with statistics and issue types directly

## Statistics provided:

The skill automatically includes comprehensive statistics:

- **Files reviewed**: Number of files analyzed
- **Issue types**: Number of unique issue types found
- **Total issues**: Total count of all issues
- **Review duration**: Time taken for the review (in seconds)

## Dynamic issue types:

The skill automatically detects and categorizes all issue types:

- **Type detection**: Automatically extracts all unique issue types (e.g., `potential_issue`, `refactor_suggestion`)
- **Type counts**: Shows count for each issue type found
- **Formatted display**: Type names are formatted for readability (e.g., "Potential Issue", "Refactor Suggestion")

## Issue prioritization:

Use issue types to prioritize fixes:

- **`potential_issue`**: Should fix (medium-high severity) - address these first
- **`refactor_suggestion`**: Consider fixing (medium severity) - improve code quality
- **Other types**: Review on a case-by-case basis based on context

## Validation and critical thinking:

**⚠️ IMPORTANT: Do NOT blindly fix every suggestion from the reviewer.**

The `/code-review` skill automatically handles CodeRabbit CLI execution and provides structured output. Review critical thinking still applies when interpreting and applying suggestions.

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

## Skill Usage:

The `/code-review` skill provides the same functionality as the previous `review-*.sh` scripts:

- Automatically detects and categorizes issue types
- Returns formatted output with statistics
- Supports both task mode (uncommitted files) and PR mode (vs main branch)
- Handles rate limiting and authentication internally

## Troubleshooting:

- **Review not available:** Ensure CodeRabbit CLI is installed (`npm install -g @coderabbitai/cli`)
- **Rate limit exceeded:** Wait 5-10 minutes before retrying
- **Authentication error:** Ensure proper authentication setup for CodeRabbit CLI
