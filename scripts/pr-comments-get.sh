#!/bin/bash
# Get a single PR comment with full context
# Usage: ./get-pr-comment.sh <PR_NUMBER> <INDEX_OR_ID> [--verbose]
#   PR_NUMBER: The PR number
#   INDEX_OR_ID: Either a number (1-based index of unresolved comments) or a comment ID
#   --verbose: Enable verbose logging

set -euo pipefail

# Source shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -r "${SCRIPT_DIR}/lib/pr-comments-utils.sh" ]; then
  echo "❌ Error: pr-comments-utils.sh not found or not readable: ${SCRIPT_DIR}/lib/pr-comments-utils.sh" >&2
  exit 1
fi
source "${SCRIPT_DIR}/lib/pr-comments-utils.sh"

# Verbose logging flag (disabled by default)
VERBOSE=false

# Source shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -r "${SCRIPT_DIR}/lib/pr-comments-utils.sh" ]; then
  echo "❌ Error: pr-comments-utils.sh not found or not readable: ${SCRIPT_DIR}/lib/pr-comments-utils.sh" >&2
  exit 1
fi
source "${SCRIPT_DIR}/lib/pr-comments-utils.sh"

# Check prerequisites
if ! check_prerequisites; then
  exit 1
fi

# Parse arguments
if [ $# -lt 2 ]; then
  log_error "Usage: $0 <PR_NUMBER> <INDEX_OR_ID> [--verbose]"
  echo ""
  echo "Examples:"
  echo "  $0 1 1              # Get first unresolved comment from PR #1"
  echo "  $0 1 2507015942     # Get comment by ID from PR #1"
  echo "  $0 1 1 --verbose    # Get first comment with verbose logging"
  exit 1
fi

PR_NUMBER="$1"
INDEX_OR_ID="$2"

# Parse verbose flag using utils
VERBOSE=$(parse_verbose_flag "$@")

# Export VERBOSE so log_verbose() can use it
export VERBOSE

# Validate PR number
if ! validate_pr_number "$PR_NUMBER"; then
  log_error "Invalid PR number: $PR_NUMBER (must be numeric)"
  exit 1
fi

# Get repository owner/repo
OWNER_REPO=$(get_repo_owner_repo)
if [ -z "$OWNER_REPO" ]; then
  exit 1
fi

log_verbose "Repository: ${OWNER_REPO}"
log_verbose "PR: #${PR_NUMBER}"

# Load metadata file using utils (sets LATEST_COMMIT_SHA as global)
METADATA_FILE=$(load_pr_metadata "$PR_NUMBER")
if [ $? -ne 0 ] || [ -z "$METADATA_FILE" ]; then
  exit 1
fi

log_verbose "Using comments file: $(basename "$METADATA_FILE")"

# Get comment by index or ID using utils
RESULT=$(get_comment_by_index_or_id "$METADATA_FILE" "$INDEX_OR_ID")
if [ $? -ne 0 ]; then
  exit 1
fi

# Extract comment and comment_id from result
COMMENT=$(echo "$RESULT" | jq -c '.comment' 2>/dev/null || echo "")
COMMENT_ID=$(echo "$RESULT" | jq -r '.comment_id // empty' 2>/dev/null || echo "")

# Log which method was used
if [ "$INDEX_OR_ID" -lt 1000 ]; then
  log_info "Found comment at index ${INDEX_OR_ID} (ID: ${COMMENT_ID})"
else
  log_verbose "Found comment by ID: ${COMMENT_ID}"
fi

# Extract comment details in single jq call using utils
COMMENT_DETAILS=$(extract_comment_details "$COMMENT")
# Use COMMENT_ID from result if available, otherwise extract from details
if [ -z "$COMMENT_ID" ]; then
  COMMENT_ID=$(echo "$COMMENT_DETAILS" | jq -r '.id // empty' 2>/dev/null || echo "")
fi
FILE_PATH=$(echo "$COMMENT_DETAILS" | jq -r '.path // empty' 2>/dev/null || echo "")
LINE_NUMBER=$(echo "$COMMENT_DETAILS" | jq -r '.line // empty' 2>/dev/null || echo "")
AUTHOR=$(echo "$COMMENT_DETAILS" | jq -r '.author // empty' 2>/dev/null || echo "")
BODY=$(echo "$COMMENT_DETAILS" | jq -r '.body // empty' 2>/dev/null || echo "")
RESOLVED=$(echo "$COMMENT_DETAILS" | jq -r '.resolved // false' 2>/dev/null || echo "false")

# Display comment information
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 PR Comment Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  PR: #${PR_NUMBER}"
echo "  Comment ID: ${COMMENT_ID}"
echo "  Status: $([ "$RESOLVED" = "true" ] && echo "✅ Resolved" || echo "❌ Unresolved")"
echo "  Author: @${AUTHOR}"
echo "  File: ${FILE_PATH}"
if [ -n "$LINE_NUMBER" ] && [ "$LINE_NUMBER" != "null" ]; then
  echo "  Line: ${LINE_NUMBER}"
fi
echo ""

# Show comment body (cleaned)
if [ -n "$BODY" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💬 Comment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  CLEAN_BODY=$(clean_html_body "$BODY")
  echo "$CLEAN_BODY"
  echo ""
fi

# Show file context if file exists using utils
if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📄 File Context: ${FILE_PATH}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  show_file_context "$FILE_PATH" "$LINE_NUMBER" 10
  echo ""
else
  if [ -n "$FILE_PATH" ]; then
    log_warning "File not found: ${FILE_PATH}"
  fi
fi

# Show quick actions (LLM-optimized: non-interactive, shows commands to run)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Quick Actions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Validate and reason: Is this a real issue, bloat, or should be dismissed?"
echo ""
echo "  If this is a REAL ISSUE:"
echo "    1. Fix the issue in the code"
echo "    2. Run: bun run pr:comments:resolve ${PR_NUMBER} ${COMMENT_ID}"
echo ""
echo "  If this is BLOAT (not worth fixing):"
echo "    Run: bun run pr:comments:dismiss ${PR_NUMBER} ${COMMENT_ID} \"bloat\""
echo "    Example: bun run pr:comments:dismiss ${PR_NUMBER} ${COMMENT_ID} \"bloat\""
echo ""
echo "  If this should be DISMISSED (with custom reason):"
echo "    Run: bun run pr:comments:dismiss ${PR_NUMBER} ${COMMENT_ID} \"<REASON>\""
echo "    Example: bun run pr:comments:dismiss ${PR_NUMBER} ${COMMENT_ID} \"not applicable\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

