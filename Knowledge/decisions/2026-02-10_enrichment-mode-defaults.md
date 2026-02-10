---
date: 2026-02-10
type: decision
domain: personal
status: active
tags:
  - decision
  - planning
summary: "Default to inline enrichment (Method A) over async queue for session intelligence"
project: "Cortana Obsidian"
---

# Enrichment Mode Defaults

## Decision

Default `ENRICHMENT_MODE` to `inline` (Method A), making session notes immediately enriched at session end, rather than requiring a background worker.

## Context

The session intelligence system supports three modes: `inline` (LLM call during SessionEnd), `async` (job queued for background worker), and `hybrid` (both). Needed to choose the default experience for new installations and for sessions where no explicit mode is configured.

## Options Considered

### Option A: Inline Default (Chosen)
- LLM call adds 2-5 seconds to session end
- Note is immediately enriched when you open Obsidian
- No background worker to install, configure, or monitor
- **Pro:** Zero setup, instant value, no moving parts
- **Con:** Adds latency to session end, limited context window for extraction

### Option B: Async Default
- Session end is instant (just queue a job)
- Background worker processes queue on a schedule
- **Pro:** No session-end latency, can use larger context windows
- **Con:** Notes are empty shells until worker runs, requires launchd/cron setup

### Option C: Hybrid Default
- Inline for basic summary, async for deep analysis
- **Pro:** Fast baseline + deep follow-up
- **Con:** Most complex, requires worker setup, two enrichment passes per note

## Rationale

The vault was born from the pain of metadata-only shells. Defaulting to `async` would recreate that problem for anyone who hasn't configured the worker — which is every new user. The 2-5 second latency at session end is invisible (the user is already closing the session), while empty notes are very visible when you open Obsidian.

**"Worse is better" applies here:** an immediately-available 80% enrichment beats a delayed 100% enrichment that requires setup.

## Consequences

- New installations get enriched notes without any configuration
- Users who want deeper analysis can set `ENRICHMENT_MODE=hybrid` and install the worker
- The async queue scaffold exists but isn't activated by default — no wasted resources

## Related Notes

- [[2026-02-10_session-intelligence-design]] — Full design of the enrichment system
- [[2026-02-10_fallback-strategy-for-deleted-state]] — Related: graceful degradation philosophy
