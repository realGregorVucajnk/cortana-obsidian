---
date: 2026-02-09
time: "20:19"
type: session
domain: personal
status: completed
tags:
  - cortana-session
  - debugging
summary: "Debugged three critical hook failures: schema mismatch, race condition, and pattern matching"
project: "Cortana Obsidian"
model: claude-opus-4-6
duration_minutes: 240
isc_satisfied: 6
isc_total: 6
---

# Hook Debugging Marathon

## Context

This was the evening session that uncovered why the Obsidian vault had zero auto-captured content despite the hook pipeline being "active" since vault creation. Three independent bugs combined to produce a 100% failure rate on every session.

## Bug 1: Schema Mismatch (ObsidianSessionCapture)

`AutoWorkCreation` (UserPromptSubmit hook) writes `current-work.json` with fields:
```json
{ "session_dir": "~/.claude/WORK/...", "task_count": 1 }
```

`ObsidianSessionCapture` expected:
```json
{ "work_dir": "~/.claude/WORK/...", "item_count": 1 }
```

**Impact:** Every session hit `process.exit(0)` at the validation step — zero notes ever captured.

**Fix:** Updated the TypeScript interface and 4 usage sites to match the actual producer's schema.

## Bug 2: Schema Mismatch (SessionSummary)

Same root cause, different consumer. `SessionSummary.hook.ts` also used `work_dir`/`item_count` instead of `session_dir`/`task_count`.

**Impact:** `META.yaml` in `WORK/` directories never updated to `COMPLETED` — all sessions remained stuck at `ACTIVE`.

**Fix:** Updated interface + usage sites. Added to [[2026-02-09_hook-state-file-contracts]] as a pattern to prevent recurrence.

## Bug 3: AgentOutputCapture Timing

`findTaskResult()` had 2 retries at 200ms, but `SubagentStop` fires before `tool_result` is written to the parent transcript. The 400ms total window was too short.

**Fix:** Increased to 4 retries at 500ms (~1.5s window). Also added fallback: if no structured completion message found, use the task description instead of `process.exit(0)`.

## Key Insight

All three bugs shared a common theme: **consumers assumed producer schemas instead of validating against them**. The schema mismatch bugs existed since initial implementation — they were never caught because the hooks produced no visible output (silent `process.exit(0)`). See [[2026-02-09_hook-state-file-contracts]].

## Commits

```
5b3e7c0 2026-02-09 20:04 Initial commit: Obsidian + Claude Code knowledge vault template
2bfa30c 2026-02-09 20:12 vault backup
e28bba9 2026-02-09 20:22 vault backup
a26f124 2026-02-09 20:25 Remove DEBUG.md after confirming hook fixes work
```

## Action Items

- [x] Fix all three bugs and verify in next session
- [ ] Add schema validation function that checks `current-work.json` shape at read time

## Related Notes

- [[2026-02-09_hook-state-file-contracts]] — Learning: validate schemas against actual producers
- [[2026-02-10_hook-race-conditions]] — Follow-up learning about parallel execution
- [[2026-02-10_0827_hook-pipeline-refactoring]] — The refactoring motivated by this debugging session
