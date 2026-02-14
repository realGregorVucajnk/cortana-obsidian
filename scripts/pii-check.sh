#!/usr/bin/env bash
# PII Detection Script
# Scans tracked files for patterns that indicate personally identifiable information.
# Used by pre-push hook and CI.
#
# Usage:
#   ./scripts/pii-check.sh staged   # scan staged files (for pre-commit)
#   ./scripts/pii-check.sh push     # scan all tracked files (for pre-push / CI)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PATTERNS_FILE="$REPO_ROOT/.pii-patterns"
ALLOWLIST_FILE="$REPO_ROOT/.pii-allowlist"

MODE="${1:-push}"

# --- Load allowlist ---
ALLOWLIST_ARGS=()
if [ -f "$ALLOWLIST_FILE" ]; then
  while IFS= read -r line; do
    line="${line%%#*}"          # strip comments
    line="${line#"${line%%[![:space:]]*}"}" # trim leading whitespace
    line="${line%"${line##*[![:space:]]}"}" # trim trailing whitespace
    [ -z "$line" ] && continue
    ALLOWLIST_ARGS+=("$line")
  done < "$ALLOWLIST_FILE"
fi

is_allowlisted() {
  local filepath="$1"
  for pattern in "${ALLOWLIST_ARGS[@]+"${ALLOWLIST_ARGS[@]}"}"; do
    # shellcheck disable=SC2254
    case "$filepath" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

# --- Load patterns ---
if [ ! -f "$PATTERNS_FILE" ]; then
  echo "No .pii-patterns file found at $PATTERNS_FILE — skipping PII scan."
  exit 0
fi

CASE_SENSITIVE_PATTERNS=()
CASE_INSENSITIVE_PATTERNS=()

while IFS= read -r line; do
  line="${line%%#*}"          # strip inline comments
  line="${line#"${line%%[![:space:]]*}"}" # trim leading whitespace
  line="${line%"${line##*[![:space:]]}"}" # trim trailing whitespace
  [ -z "$line" ] && continue

  # [i] prefix means case-insensitive
  if [[ "$line" == "[i] "* ]]; then
    CASE_INSENSITIVE_PATTERNS+=("${line#\[i\] }")
  else
    CASE_SENSITIVE_PATTERNS+=("$line")
  fi
done < "$PATTERNS_FILE"

if [ ${#CASE_SENSITIVE_PATTERNS[@]} -eq 0 ] && [ ${#CASE_INSENSITIVE_PATTERNS[@]} -eq 0 ]; then
  echo "No patterns found in $PATTERNS_FILE — skipping PII scan."
  exit 0
fi

# --- Get file list ---
get_files() {
  case "$MODE" in
    staged)
      git -C "$REPO_ROOT" diff --cached --name-only --diff-filter=ACM
      ;;
    push)
      git -C "$REPO_ROOT" ls-files
      ;;
    *)
      echo "Unknown mode: $MODE (use 'staged' or 'push')" >&2
      exit 2
      ;;
  esac
}

# --- Scan ---
violations=0

while IFS= read -r filepath; do
  [ -z "$filepath" ] && continue

  # Skip binary files
  if file "$REPO_ROOT/$filepath" | grep -q "binary"; then
    continue
  fi

  # Skip allowlisted paths
  if is_allowlisted "$filepath"; then
    continue
  fi

  # Case-sensitive patterns
  for pattern in "${CASE_SENSITIVE_PATTERNS[@]+"${CASE_SENSITIVE_PATTERNS[@]}"}"; do
    matches=$(grep -nE "$pattern" "$REPO_ROOT/$filepath" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      while IFS= read -r match_line; do
        line_num="${match_line%%:*}"
        content="${match_line#*:}"
        echo "PII DETECTED: $filepath:$line_num"
        echo "  Pattern: $pattern"
        echo "  Content: $content"
        echo ""
        violations=$((violations + 1))
      done <<< "$matches"
    fi
  done

  # Case-insensitive patterns
  for pattern in "${CASE_INSENSITIVE_PATTERNS[@]+"${CASE_INSENSITIVE_PATTERNS[@]}"}"; do
    matches=$(grep -niE "$pattern" "$REPO_ROOT/$filepath" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      while IFS= read -r match_line; do
        line_num="${match_line%%:*}"
        content="${match_line#*:}"
        echo "PII DETECTED: $filepath:$line_num"
        echo "  Pattern (case-insensitive): $pattern"
        echo "  Content: $content"
        echo ""
        violations=$((violations + 1))
      done <<< "$matches"
    fi
  done

done < <(get_files)

if [ "$violations" -gt 0 ]; then
  echo "========================================="
  echo "BLOCKED: $violations PII pattern match(es) found."
  echo "Fix the violations above, or add false positives to .pii-allowlist."
  echo "========================================="
  exit 1
fi

echo "PII scan passed — no matches found."
exit 0
