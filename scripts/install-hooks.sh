#!/usr/bin/env bash
# Install PII detection git hooks for this repository.
# Sets core.hooksPath to .githooks/ (tracked in repo).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

existing=$(git config --local core.hooksPath 2>/dev/null || true)
if [ -n "$existing" ] && [ "$existing" != ".githooks" ]; then
  echo "WARNING: core.hooksPath is already set to '$existing'"
  echo "This will be overridden. Press Ctrl+C to abort, Enter to continue."
  read -r
fi

git config --local core.hooksPath .githooks
chmod +x .githooks/*
echo "PII detection hooks installed. Active on push."
