---
date: 2026-02-11
time: "09:15"
type: session
session_type: debugging
domain: personal
status: completed
summary_engine: openai-gpt-4o
summary_model: "gpt-4o"
distill_count: 1
enrichment_mode: inline
tags:
  - cortana-session
  - debugging
  - learning
summary: "Debug flaky CI test caused by timezone-dependent date formatting"
session_id: "b2c3d4e5-f6a7-8901-bcde-f23456789012"
project: "my-cli-tool"
model: "claude-sonnet-4-5-20250929"
duration_minutes: 32
---

# Debug flaky CI test caused by timezone-dependent date formatting

## Executive Summary

- **Goal:** Investigate and fix intermittent test failure in `format-output.test.ts` that only failed in CI (GitHub Actions) but passed locally
- **Work:** Traced the flake to a date formatting assertion that assumed `America/Chicago` timezone. CI runs in UTC, producing different output. Fixed by using `Intl.DateTimeFormat` with explicit timezone parameter
- **Outcome:** Tests now pass in all timezones. Added a CI matrix entry for `TZ=Asia/Tokyo` to catch future timezone assumptions

## Key Decisions and Why

- **Explicit timezone in all date formatting, not just the broken test** — Audited all 7 call sites of `formatDate()` and found 3 more that would break under non-US timezones. Fixed them all now rather than waiting for more flakes.

- **CI timezone matrix over mocking `Date`** — Mocking `Date` hides real bugs. Running the full suite under a non-local timezone catches timezone assumptions anywhere in the codebase, not just in known-fragile spots.

## Recommended to Save

- [learning] Timezone-dependent test flakes (94%)
  When tests pass locally but fail in CI, check timezone assumptions first. CI runners typically use UTC.

## Digest

Investigated a flaky CI test that passed locally but failed ~30% of the time on GitHub Actions. Root cause was `formatDate()` using the system default timezone (`America/Chicago` locally, `UTC` in CI) for formatting dates in assertions. Fixed all 7 call sites to accept an explicit timezone parameter. Added `TZ=Asia/Tokyo` to the CI test matrix as a canary for future timezone assumptions.

## Git Context

- Repo: `~/personal/my-cli-tool`
- Branch: `fix/timezone-flake`
- HEAD: `c8a3b10`
- Changed files (working tree): 0
- Changed files (staged): 0
- Diff stats: +89 / -34
- Top paths:
  - `src/utils/format-date.ts`
  - `src/utils/format-date.test.ts`
  - `src/commands/report.ts`
  - `.github/workflows/ci.yml`
