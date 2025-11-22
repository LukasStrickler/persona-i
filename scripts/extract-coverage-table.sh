#!/bin/bash
# Extract coverage table from coverage-final.json (v8 format)
# Outputs a markdown table similar to vitest CLI output with file breakdown and directory grouping

set -e

COVERAGE_FILE="$1"

if [ -z "$COVERAGE_FILE" ] || [ ! -f "$COVERAGE_FILE" ]; then
  echo "❌ Coverage file not found: $COVERAGE_FILE" >&2
  exit 1
fi

# Calculate coverage percentages from v8 format and generate detailed table with directory grouping
COVERAGE_TABLE=$(cat "$COVERAGE_FILE" | jq -r '
  # Helper function to calculate percentage (must be defined first)
  def calc_pct(covered; total): if total > 0 then ((covered / total * 100) | floor) else 100 end;
  
  # Helper to extract relative path (remove absolute path prefix)
  def rel_path(path): 
    path | 
    if startswith("/") then 
      split("/") | 
      if .[0:3] == ["", "Users", "lukasstrickler"] then .[4:] | join("/") 
      elif .[0:2] == ["", "home"] then .[2:] | join("/")
      else .[1:] | join("/") end
    else path end;
  
  # Get all file entries with coverage data
  to_entries | map({
    path: .key,
    rel_path: (rel_path(.key)),
    dir: (rel_path(.key) | split("/")[0:-1] | join("/")),
    filename: (rel_path(.key) | split("/") | .[-1]),
    statements: {
      total: (.value.s | to_entries | length),
      covered: ([.value.s | to_entries | map(.value) | map(select(. > 0)) | length] | add // 0)
    },
    branches: {
      total: (.value.b | to_entries | length),
      covered: ([.value.b | to_entries | map(.value) | map(select(. > 0)) | length] | add // 0)
    },
    functions: {
      total: (.value.f | to_entries | length),
      covered: ([.value.f | to_entries | map(.value) | map(select(. > 0)) | length] | add // 0)
    },
    lines: {
      total: (.value.statementMap | to_entries | length),
      covered: ([.value.s | to_entries | map(.value) | map(select(. > 0)) | length] | add // 0)
    }
  }) |
  # Group by directory
  (reduce .[] as $file ({}; 
    .[$file.dir] += [$file]
  )) |
  # Calculate totals across all files
  {
    files: [.[] | .[]],
    totals: {
      statements: {
        total: ([.[] | .[] | .statements.total] | add // 0),
        covered: ([.[] | .[] | .statements.covered] | add // 0)
      },
      branches: {
        total: ([.[] | .[] | .branches.total] | add // 0),
        covered: ([.[] | .[] | .branches.covered] | add // 0)
      },
      functions: {
        total: ([.[] | .[] | .functions.total] | add // 0),
        covered: ([.[] | .[] | .functions.covered] | add // 0)
      },
      lines: {
        total: ([.[] | .[] | .lines.total] | add // 0),
        covered: ([.[] | .[] | .lines.covered] | add // 0)
      }
    },
    directories: (to_entries | map({
      dir: .key,
      dir_display: (.key | split("/") | .[-1]),
      files: .value,
      totals: {
        statements: {
          total: ([.value[].statements.total] | add // 0),
          covered: ([.value[].statements.covered] | add // 0)
        },
        branches: {
          total: ([.value[].branches.total] | add // 0),
          covered: ([.value[].branches.covered] | add // 0)
        },
        functions: {
          total: ([.value[].functions.total] | add // 0),
          covered: ([.value[].functions.covered] | add // 0)
        },
        lines: {
          total: ([.value[].lines.total] | add // 0),
          covered: ([.value[].lines.covered] | add // 0)
        }
      }
    }) | sort_by(.dir))
  } |
  # Generate markdown table
  "| File | % Stmts | % Branch | % Funcs | % Lines |\n" +
  "|------|---------|----------|----------|--------|\n" +
  "| **All files** | " + 
    (calc_pct(.totals.statements.covered; .totals.statements.total) | tostring) + "% | " +
    (calc_pct(.totals.branches.covered; .totals.branches.total) | tostring) + "% | " +
    (calc_pct(.totals.functions.covered; .totals.functions.total) | tostring) + "% | " +
    (calc_pct(.totals.lines.covered; .totals.lines.total) | tostring) + "% |\n" +
  ([.directories[] | 
    "| " + .dir_display + " | " +
    (calc_pct(.totals.statements.covered; .totals.statements.total) | tostring) + "% | " +
    (calc_pct(.totals.branches.covered; .totals.branches.total) | tostring) + "% | " +
    (calc_pct(.totals.functions.covered; .totals.functions.total) | tostring) + "% | " +
    (calc_pct(.totals.lines.covered; .totals.lines.total) | tostring) + "% |\n" +
    ([.files[] | 
      "| " + ("  " + .filename) + " | " +
      (calc_pct(.statements.covered; .statements.total) | tostring) + "% | " +
      (calc_pct(.branches.covered; .branches.total) | tostring) + "% | " +
      (calc_pct(.functions.covered; .functions.total) | tostring) + "% | " +
      (calc_pct(.lines.covered; .lines.total) | tostring) + "% |"
    ] | join("\n"))
  ] | join("\n"))
')

# Output the table
echo "$COVERAGE_TABLE"
