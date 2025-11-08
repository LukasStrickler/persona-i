#!/bin/bash
# Agent finalize script - runs typecheck, lint, and format check
# Shows full error messages with line numbers, exits with error code if any check fails

ERRORS=0

echo "🔍 Running typecheck..."
TYPECHECK_OUTPUT=$(bun run typecheck 2>&1)
TYPECHECK_EXIT=$?
if [ $TYPECHECK_EXIT -ne 0 ] || echo "$TYPECHECK_OUTPUT" | grep -qiE 'error'; then
  echo "❌ Typecheck failed:"
  echo "$TYPECHECK_OUTPUT"
  ERRORS=1
else
  echo "✅ Typecheck passed"
fi

echo ""
echo "🔍 Running lint..."
LINT_OUTPUT=$(bun run lint 2>&1)
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ] || echo "$LINT_OUTPUT" | grep -qiE 'error|warning'; then
  echo "❌ Lint failed:"
  echo "$LINT_OUTPUT"
  ERRORS=1
else
  echo "✅ Lint passed"
fi

echo ""
echo "🔍 Running format check..."
FORMAT_OUTPUT=$(bun run format:check 2>&1)
FORMAT_EXIT=$?
if [ $FORMAT_EXIT -ne 0 ] || echo "$FORMAT_OUTPUT" | grep -qiE 'error|warn'; then
  echo "❌ Format check failed:"
  echo "$FORMAT_OUTPUT"
  ERRORS=1
else
  echo "✅ Format check passed"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Some checks failed. Please fix the errors above."
  exit 1
fi
