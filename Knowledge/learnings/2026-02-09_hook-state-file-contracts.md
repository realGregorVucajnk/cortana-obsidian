---
date: 2026-02-09
type: learning
domain: personal
status: active
tags:
  - learning
  - debugging
summary: "Always validate shared state file schemas against actual producers, not assumed interfaces"
project: "Cortana Obsidian"
---

# Hook State File Contracts

## What Happened

Three hooks consumed `current-work.json` written by `AutoWorkCreation`. All three used incorrect field names (`work_dir`/`item_count` instead of the actual `session_dir`/`task_count`). The bugs existed since initial implementation — **zero notes were ever successfully captured** across weeks of usage.

## Why It Was Hard to Catch

1. **Silent failure mode** — Hooks called `process.exit(0)` when fields were missing, not `process.exit(1)`. No error in any log.
2. **No type sharing** — The producer (`AutoWorkCreation`) and consumers (`ObsidianSessionCapture`, `SessionSummary`) were in different repos/directories with no shared TypeScript interface.
3. **Plausible field names** — `work_dir` vs `session_dir` and `item_count` vs `task_count` are semantically similar. The mismatch wasn't obvious from reading the consumer code alone.
4. **No integration test** — Each hook was tested in isolation (if at all), never as part of the full pipeline.

## Root Cause

**Consumers assumed the producer's schema instead of verifying it.** The interface was defined by reading the producer's documentation (or memory of it) rather than reading the producer's actual output.

## Prevention Strategy

1. **Read the actual output first** — Before writing a consumer, `cat` the actual file the producer creates. Compare against your interface definition.
2. **Shared type definitions** — If multiple hooks consume the same file, define the interface once in a shared `types.ts` and import it.
3. **Fail loudly** — Use `process.exit(1)` with an error message, not `process.exit(0)`, when expected fields are missing.
4. **End-to-end validation** — After writing a new consumer, trigger the full pipeline once and verify the output file exists and contains expected content.

## Applied Fix

- Updated 3 consumer hooks to use correct field names
- Created `hooks/core/types.ts` with shared `CurrentWork` interface
- Changed all `process.exit(0)` on validation failure to `console.error()` + `process.exit(1)`

## Action Items

- [ ] Add a CI check that validates `current-work.json` schema against the shared type definition
- [x] Fix all three consumer hooks
- [x] Create shared types in `hooks/core/types.ts`

## Related Notes

- [[2026-02-09_2019_hook-debugging-marathon]] — Session where these bugs were discovered
- [[2026-02-10_hook-pipeline-refactoring]] — Refactoring that formalized the shared types
- [[2026-02-10_fallback-strategy-for-deleted-state]] — Related decision about state file fragility
