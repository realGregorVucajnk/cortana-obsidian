---
date: 2026-02-10
time: "11:43"
type: session
domain: personal
status: completed
tags:
  - cortana-session
  - planning
summary: "Designed session intelligence system with inline enrichment and async queue scaffold"
project: "Cortana Obsidian"
model: claude-opus-4-6
duration_minutes: 120
isc_satisfied: 6
isc_total: 7
---

# Session Intelligence Design

## Context

Session notes captured by the hook pipeline were structurally correct but content-thin — just a title, timestamps, and a one-line summary. The goal was to design a system that enriches session notes with meaningful content: key decisions, code changes, git stats, and learnings extracted from the transcript.

## Design Overview

### Enrichment Modes (`ENRICHMENT_MODE` env var)

| Mode | How It Works | Latency | Quality |
|------|-------------|---------|---------|
| `inline` (Method A) | LLM call during SessionEnd hook, result written directly into note | +2-5s at session end | Good — single-pass extraction |
| `async` (Method B) | Job queued to `hooks/core/queue/`, worker processes later | Near-zero at session end | Better — can re-process with larger context |
| `hybrid` | Inline for summary, async for deep analysis | +1-2s at session end | Best — fast baseline + deep follow-up |

**Default: `inline`** — See [[2026-02-10_enrichment-mode-defaults]] for rationale.

### Architecture Implemented

```
hooks/core/session-intelligence.ts  (204 lines)
  ├── extractSessionIntelligence()   — reads transcript, calls LLM
  ├── buildEnrichmentPrompt()        — constructs extraction prompt
  └── renderEnrichment()             — formats as markdown sections

hooks/core/llm.ts                   (156 lines)
  ├── callInference()                — wraps PAI Inference.ts tool
  ├── parseStructuredResponse()      — extracts JSON from LLM output
  └── fallbackToBasic()              — graceful degradation if LLM fails

hooks/core/queue/                    (scaffold only)
  ├── types.ts                       — QueueJob interface (25 lines)
  ├── store.ts                       — File-based job store (90 lines)
  └── enqueue.ts                     — Job creation helper (13 lines)
```

### Enrichment Output Sections

When Method A runs, it adds these sections to the session note:

1. **Key Outcomes** — 3-5 bullet points of what was accomplished
2. **Technical Changes** — Files modified with brief descriptions
3. **Decisions Made** — In-session architectural choices
4. **Git Activity** — Commit hashes, diff stats, branch info
5. **Learnings** — What worked, what didn't, what to remember

## Key Commits

```
78c8fd7 vault backup: 2026-02-10 16:42:51
  23 files changed, 1178 insertions(+), 112 deletions(-)
```

This commit includes the full session intelligence implementation along with queue scaffolding, LLM integration, and rendering pipeline.

## Decisions Made

- Inline enrichment (Method A) as default — pragmatic choice for immediate value
- Queue scaffold ready but not activated — avoids premature complexity
- LLM calls use `PAI Inference.ts fast` for speed over depth
- Graceful fallback: if LLM fails, note still captures basic metadata (no worse than before)

## Action Items

- [ ] Implement the async enrichment worker (`hooks/workers/enrichment-worker.ts` is scaffolded)
- [ ] Add token budget management for transcript excerpts sent to LLM
- [x] Write architecture documentation in `docs/session-intelligence/`
- [ ] Benchmark LLM call latency across different transcript sizes

## Related Notes

- [[2026-02-10_enrichment-mode-defaults]] — Decision: why inline is the default
- [[2026-02-10_0827_hook-pipeline-refactoring]] — The refactoring that made this possible
- [[2026-02-10_progressive-disclosure-documentation]] — Documentation pattern used for the runbook
