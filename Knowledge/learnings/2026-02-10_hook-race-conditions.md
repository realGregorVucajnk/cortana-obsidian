---
date: 2026-02-10
type: learning
domain: personal
status: active
tags:
  - learning
  - debugging
summary: "Parallel SessionEnd hooks need fallback strategies when they share mutable state"
project: "Cortana Obsidian"
---

# Hook Race Conditions

## What Happened

`SessionSummary` and `ObsidianSessionCapture` both fire at `SessionEnd`. `SessionSummary` deletes `current-work.json` as part of cleanup. When it runs first (~50% of the time), `ObsidianSessionCapture` finds no state file and silently produces no note.

This was discovered while investigating why only ~50% of sessions produced Obsidian notes, even after the schema mismatch fix (see [[2026-02-09_hook-state-file-contracts]]).

## Root Cause

**Parallel hooks sharing mutable filesystem state without coordination.** Claude Code fires all hooks matching the same event in parallel with no priority ordering. Each hook assumes exclusive access to shared files.

## The Fix

Added `findRecentActiveSession()` fallback to `ObsidianSessionCapture`:

```typescript
// Primary path: read current-work.json
let context = readCurrentWork();

// Fallback: scan WORK/ directory for recent sessions
if (!context) {
  context = findRecentActiveSession();
}

// Only fail if both paths fail
if (!context) {
  console.error("No session context found via primary or fallback path");
  process.exit(1);
}
```

This brought note capture from ~50% to ~100% success rate.

## General Principle

When multiple hooks consume the same event:
1. **Don't assume ordering** — Even if it works now, the execution order may change
2. **Don't mutate shared state** — Or if you must, make consumers resilient to its absence
3. **Design fallbacks** — Every state-dependent operation should have a degraded-but-functional alternative
4. **Log the fallback** — When the primary path fails and fallback is used, log it so you can monitor the race condition frequency

## Broader Applicability

This pattern appears in any system with:
- **Event-driven hooks** (GitHub Actions jobs, CI pipelines, serverless triggers)
- **Shared filesystem state** (lock files, PID files, state files)
- **No built-in ordering** (parallel execution is the default)

## Action Items

- [ ] Add monitoring: log when fallback path is used, alert if >50% of sessions use it
- [x] Implement `findRecentActiveSession()` fallback
- [x] Document the race condition in `CLAUDE.md` hook pipeline section

## Related Notes

- [[2026-02-10_fallback-strategy-for-deleted-state]] — Decision record for the fallback approach
- [[2026-02-09_hook-state-file-contracts]] — The schema fix that revealed this second bug
- [[2026-02-10_hook-fixes-verification]] — Verification that the fix works end-to-end
