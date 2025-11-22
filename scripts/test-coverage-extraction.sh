#!/bin/bash
# Test script to verify coverage extraction works locally
# Simulates what GitHub Actions does

set -e

echo "🧪 Testing Coverage Extraction"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directories
TEST_DIRS=("coverage/unit" "coverage/integration")

for TEST_DIR in "${TEST_DIRS[@]}"; do
  echo -e "${YELLOW}Testing: ${TEST_DIR}${NC}"
  
  # Try multiple possible paths for coverage files
  COVERAGE_FILE=""
  for path in "${TEST_DIR}/coverage-final.json" "${TEST_DIR}/coverage-summary.json" "${TEST_DIR}/coverage/coverage-summary.json" "./${TEST_DIR}/coverage-final.json"; do
    if [ -f "$path" ]; then
      COVERAGE_FILE="$path"
      echo -e "${GREEN}✓ Found coverage file: $COVERAGE_FILE${NC}"
      break
    fi
  done
  
  if [ -z "$COVERAGE_FILE" ]; then
    echo -e "${RED}✗ Coverage file not found${NC}"
    echo "  Searched:"
    echo "    - ${TEST_DIR}/coverage-final.json"
    echo "    - ${TEST_DIR}/coverage-summary.json"
    echo "    - ${TEST_DIR}/coverage/coverage-summary.json"
    echo ""
    echo "  Available files in ${TEST_DIR}/:"
    if [ -d "$TEST_DIR" ]; then
      ls -la "$TEST_DIR" 2>/dev/null || echo "    (directory exists but empty)"
    else
      echo "    (directory does not exist)"
    fi
    echo ""
    continue
  fi
  
  # Check if jq is available
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}✗ jq is not installed${NC}"
    echo "  Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    echo ""
    continue
  fi
  
  # Extract coverage table using the extraction script
  echo "  Extracting coverage data..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  COVERAGE_TABLE=$(bash "$SCRIPT_DIR/extract-coverage-table.sh" "$COVERAGE_FILE" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ] && [ -n "$COVERAGE_TABLE" ] && ! echo "$COVERAGE_TABLE" | grep -q "null%"; then
    echo -e "${GREEN}✓ Successfully extracted coverage:${NC}"
    echo "$COVERAGE_TABLE"
    echo ""
  else
    echo -e "${RED}✗ Failed to extract coverage data${NC}"
    if [ -n "$COVERAGE_TABLE" ]; then
      echo "  Error output: $COVERAGE_TABLE" >&2
    fi
    echo ""
  fi
done

echo "================================"
echo "Test complete!"
echo ""
echo "To generate coverage reports, run:"
echo "  COVERAGE_DIR=./coverage/unit bun run test:unit --coverage"
echo "  COVERAGE_DIR=./coverage/integration bun run test:integration --coverage"

