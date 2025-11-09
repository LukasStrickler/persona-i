#!/bin/bash
# Resolve PR review comments in GitHub
# Usage: ./resolve-pr-comments.sh <PR_NUMBER> <COMMENT_ID_1> [COMMENT_ID_2] ...
#   PR_NUMBER: The PR number
#   COMMENT_ID: One or more comment IDs to resolve (databaseId from REST API)

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
if [ $# -lt 2 ]; then
  log_error "Usage: $0 <PR_NUMBER> <COMMENT_ID_1> [COMMENT_ID_2] ..."
  echo ""
  echo "Examples:"
  echo "  $0 1 2507094339           # Resolve comment by ID"
  echo "  $0 1 2507094339 2507094340 # Resolve multiple comments by ID"
  echo ""
  echo "Note: Only comment IDs are accepted (not indices)."
  echo "      Use 'bun run pr:comments:get <PR_NUMBER> <INDEX>' to find comment IDs."
  exit 1
fi

PR_NUMBER="$1"
shift
COMMENT_IDS=("$@")

# Validate PR number using utils
if ! validate_pr_number "$PR_NUMBER"; then
  log_error "Invalid PR number: $PR_NUMBER (must be numeric)"
  exit 1
fi

# Validate all arguments are comment IDs (numeric)
for COMMENT_ID in "${COMMENT_IDS[@]}"; do
  if ! echo "$COMMENT_ID" | grep -qE '^[0-9]+$'; then
    log_error "Invalid comment ID: ${COMMENT_ID} (must be numeric)"
    echo "   Use 'bun run pr:comments:get <PR_NUMBER> <INDEX>' to find comment IDs."
    exit 1
  fi
done

# Get repository owner/repo
OWNER_REPO=$(get_repo_owner_repo)
if [ -z "$OWNER_REPO" ]; then
  exit 1
fi

# Parse owner/repo using utils
read OWNER REPO <<< "$(parse_owner_repo "$OWNER_REPO")"

log_info "Repository: ${OWNER}/${REPO}"
log_info "PR: #${PR_NUMBER}"
log_info "Comment IDs to resolve: ${COMMENT_IDS[*]}"
echo ""

# Fetch all review threads to find thread IDs for the comment IDs
log_info "Fetching review threads to find thread IDs..."

# Build array of comment IDs for jq (as numbers, not strings)
COMMENT_IDS_JSON=$(printf '%s\n' "${COMMENT_IDS[@]}" | jq -R 'tonumber' | jq -s .)

# Find threads for comment IDs using utility function
THREAD_MAP=$(find_threads_for_comments "$OWNER" "$REPO" "$PR_NUMBER" "$COMMENT_IDS_JSON")

THREAD_IDS_TO_RESOLVE=()

# Process thread map to extract thread IDs
if [ -n "$THREAD_MAP" ] && [ "$THREAD_MAP" != "[]" ] && [ "$THREAD_MAP" != "null" ]; then
  while IFS= read -r entry; do
    if [ -n "$entry" ] && [ "$entry" != "null" ]; then
      COMMENT_ID=$(echo "$entry" | jq -r '.comment_id // empty' 2>/dev/null)
      THREAD_ID=$(echo "$entry" | jq -r '.thread_id // empty' 2>/dev/null)
      IS_RESOLVED=$(echo "$entry" | jq -r '.is_resolved // false' 2>/dev/null || echo "false")
      
      if [ -z "$THREAD_ID" ]; then
        continue
      fi
      
      if [ "$IS_RESOLVED" = "true" ]; then
        log_warning "Comment ${COMMENT_ID} is already in a resolved thread (thread: ${THREAD_ID})"
      else
        THREAD_IDS_TO_RESOLVE+=("$THREAD_ID")
        log_info "Found thread ${THREAD_ID} for comment ${COMMENT_ID}"
      fi
    fi
  done <<< "$(echo "$THREAD_MAP" | jq -c '.[]' 2>/dev/null || echo "")"
fi


# Remove duplicates from thread IDs
if [ ${#THREAD_IDS_TO_RESOLVE[@]} -gt 0 ]; then
  UNIQUE_THREAD_IDS=($(printf '%s\n' "${THREAD_IDS_TO_RESOLVE[@]}" | sort -u))
else
  UNIQUE_THREAD_IDS=()
fi

if [ ${#UNIQUE_THREAD_IDS[@]} -eq 0 ]; then
  log_warning "No threads found to resolve"
  exit 0
fi

# Show threads to resolve
echo ""
echo "📋 Threads to resolve:"
for THREAD_ID in "${UNIQUE_THREAD_IDS[@]}"; do
  echo "  - ${THREAD_ID}"
done
echo ""

# Confirm before resolving
read -p "Resolve these ${#UNIQUE_THREAD_IDS[@]} thread(s)? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
  log_warning "Cancelled by user"
  exit 0
fi

# Resolve each thread using utility function
log_info "Resolving threads..."
RESOLVED_COUNT=0
FAILED_COUNT=0

for THREAD_ID in "${UNIQUE_THREAD_IDS[@]}"; do
  if resolve_review_thread "$THREAD_ID"; then
    RESOLVED_COUNT=$((RESOLVED_COUNT + 1))
  else
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

echo ""
if [ "$RESOLVED_COUNT" -gt 0 ]; then
  log_success "Resolved ${RESOLVED_COUNT} thread(s)"
fi

if [ "$FAILED_COUNT" -gt 0 ]; then
  log_warning "${FAILED_COUNT} thread(s) failed to resolve"
fi

# Automatically refresh comments to get latest data
if [ "$RESOLVED_COUNT" -gt 0 ]; then
  echo ""
  log_info "Refreshing comments to get latest data..."
  bash "${SCRIPT_DIR}/pr-comments-fetch.sh" read "$PR_NUMBER" > /dev/null 2>&1 || log_warning "Failed to refresh comments"
fi

echo ""
log_info "Done!"

