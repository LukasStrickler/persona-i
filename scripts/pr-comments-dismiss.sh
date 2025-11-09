#!/bin/bash
# Dismiss PR review comments with a reason
# Usage: ./dismiss-pr-comment.sh <PR_NUMBER> <COMMENT_ID> <REASON>
#   PR_NUMBER: The PR number
#   COMMENT_ID: The comment ID to dismiss
#   REASON: The reason for dismissal (e.g., "not applicable", "false positive", "out of scope")

set -euo pipefail

# Source shared utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -r "${SCRIPT_DIR}/lib/pr-comments-utils.sh" ]; then
  echo "❌ Error: pr-comments-utils.sh not found or not readable: ${SCRIPT_DIR}/lib/pr-comments-utils.sh" >&2
  exit 1
fi
source "${SCRIPT_DIR}/lib/pr-comments-utils.sh"

# Check all prerequisites at once using utils
if ! check_prerequisites; then
  exit 1
fi

# Parse arguments
if [ $# -lt 3 ]; then
  log_error "Usage: $0 <PR_NUMBER> <COMMENT_ID> <REASON>"
  echo ""
  echo "Examples:"
  echo "  $0 1 2507094339 \"not applicable\""
  echo "  $0 1 2507094339 \"false positive\""
  echo "  $0 1 2507094339 \"out of scope\""
  echo ""
  echo "Note: REASON should be a short description of why the comment is being dismissed."
  exit 1
fi

PR_NUMBER="$1"
COMMENT_ID="$2"
REASON="$3"

# Validate PR number using utils
if ! validate_pr_number "$PR_NUMBER"; then
  log_error "Invalid PR number: $PR_NUMBER (must be numeric)"
  exit 1
fi

# Validate comment ID (must be numeric)
if ! echo "$COMMENT_ID" | grep -qE '^[0-9]+$'; then
  log_error "Invalid comment ID: ${COMMENT_ID} (must be numeric)"
  echo "   Use 'bun run pr:comments:get <PR_NUMBER> <INDEX>' to find comment IDs."
  exit 1
fi

# Validate reason (not empty)
if [ -z "$REASON" ]; then
  log_error "Dismissal reason cannot be empty"
  exit 1
fi

# Get repository owner/repo
OWNER_REPO=$(get_repo_owner_repo)
if [ -z "$OWNER_REPO" ]; then
  exit 1
fi

# Parse owner/repo using utils
read OWNER REPO <<< "$(parse_owner_repo "$OWNER_REPO")"

log_info "Repository: ${OWNER}/${REPO}"
log_info "PR: #${PR_NUMBER}"
log_info "Comment ID: ${COMMENT_ID}"
log_info "Reason: ${REASON}"
echo ""

# Find thread ID for the comment ID using utility function
log_info "Finding thread for comment ID ${COMMENT_ID}..."

# Build array of comment IDs for jq
COMMENT_IDS_JSON=$(echo "[$COMMENT_ID]" | jq -c .)

# Find threads for comment IDs using utility function
THREAD_MAP=$(find_threads_for_comments "$OWNER" "$REPO" "$PR_NUMBER" "$COMMENT_IDS_JSON")

# Extract thread info for this comment
THREAD_INFO=$(echo "$THREAD_MAP" | jq -c --arg comment_id "$COMMENT_ID" '.[] | select(.comment_id == ($comment_id | tonumber)) | {id: .thread_id, isResolved: .is_resolved}' 2>/dev/null | head -1)

if [ -z "$THREAD_INFO" ] || [ "$THREAD_INFO" = "null" ]; then
  log_error "Thread not found for comment ID ${COMMENT_ID}"
  exit 1
fi

THREAD_ID=$(echo "$THREAD_INFO" | jq -r '.id // empty' 2>/dev/null)
IS_RESOLVED=$(echo "$THREAD_INFO" | jq -r '.isResolved // false' 2>/dev/null || echo "false")

if [ -z "$THREAD_ID" ]; then
  log_error "Failed to extract thread ID for comment ${COMMENT_ID}"
  exit 1
fi

if [ "$IS_RESOLVED" = "true" ]; then
  log_warning "Thread ${THREAD_ID} is already resolved"
  echo ""
  log_info "Note: Adding dismissal comment will not unresolve the thread."
  echo ""
  read -p "Add dismissal comment anyway? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
    log_warning "Cancelled by user"
    exit 0
  fi
  # Skip resolving if already resolved
  SKIP_RESOLVE=true
else
  SKIP_RESOLVE=false
fi

echo ""
log_info "Found thread ${THREAD_ID} for comment ${COMMENT_ID}"
echo ""

# Dismiss the comment using utility function
# Pass PR number, owner, repo, thread ID, comment ID, reason, and skip_resolve flag
if dismiss_review_comment "$PR_NUMBER" "$OWNER" "$REPO" "$THREAD_ID" "$COMMENT_ID" "$REASON" "$SKIP_RESOLVE"; then
  echo ""
  log_success "Comment dismissed successfully"
  
  # Automatically refresh comments to get latest data
  log_info "Refreshing comments to get latest data..."
  bash "${SCRIPT_DIR}/pr-comments-fetch.sh" read "$PR_NUMBER" > /dev/null 2>&1 || log_warning "Failed to refresh comments"
  
  echo ""
  log_info "Done!"
else
  echo ""
  log_error "Failed to dismiss comment"
  exit 1
fi

echo ""

