---
date: 2026-02-11
type: learning
domain: personal
status: active
project: "my-cli-tool"
tags:
  - knowledge
  - learning
  - debugging
summary: "Timezone-dependent tests pass locally but fail in CI — always use explicit timezones"
source_sessions:
  - "[[2026-02-11_0915_debug-flaky-ci-timezone]]"
category: "testing"
---

# Timezone-dependent tests fail in CI

## What Happened

Tests using `formatDate()` passed locally (America/Chicago) but failed ~30% of the time on GitHub Actions (UTC). The formatted output differed because the function used the system default timezone.

## What Was Learned

- **CI runners use UTC by default.** Any date formatting that relies on the system timezone will produce different output in CI vs. local development.
- **Flaky tests are often environment-dependent, not race conditions.** The first instinct was to look for async timing issues, but the actual cause was a deterministic environment difference.
- **Auditing all call sites matters.** The initial bug was in one test, but 3 other call sites had the same latent bug. Fixing only the reported one would have left the others as future flakes.

## How to Apply This

1. **Always pass explicit timezones** to date formatting functions. Never rely on system defaults.
2. **Add a non-local timezone to CI matrix** (e.g., `TZ=Asia/Tokyo`) as a canary for timezone assumptions anywhere in the codebase.
3. **When debugging flaky CI, check environment differences first** — timezone, locale, file system case sensitivity, line endings — before assuming race conditions.
