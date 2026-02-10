# Session Intelligence Architecture

## Goal

Generate meaningful, human-readable session context automatically while preserving provider-specific compatibility.

## Methods

### Method A (Active Default)

Inline enrichment at SessionEnd:
1. Collect context from transcript, thread/task data, and git snapshot.
2. Call LLM summary pipeline.
3. Render enriched session note.
4. Auto-distill high-confidence knowledge notes.

### Method B (Implemented Scaffold)

Async queue + worker path:
1. SessionEnd enqueues enrichment job (`.hooks-queue/pending`).
2. Worker claims and processes jobs.
3. Worker writes enrichment result artifacts and updates job status.
4. Retry/backoff policy handles transient failures.

### Method C (Hybrid Target)

Inline concise summary + async upgraded enrichment:
1. SessionEnd writes immediate useful note.
2. Worker enriches/extends later with deeper digest and distill upgrades.

## Components

- `hooks/core/session-intelligence.ts`
  - LLM + heuristic fallback
  - recommendation scoring
  - auto-distill
- `hooks/core/llm.ts`
  - model routing (Claude/Codex/ollama via config)
- `hooks/core/git.ts`
  - repository snapshot collection
- `hooks/core/queue/*`
  - Method B queue contracts/store/enqueue
- `hooks/workers/enrichment-worker.ts`
  - worker execution loop

## Data Flow

### Inline

`SessionEnd adapter -> runSessionIntelligence -> renderSessionNote -> write note (+ optional distill notes)`

### Async

`SessionEnd adapter -> enqueueSessionEnrichment -> worker claim/process/finalize`

### Hybrid

`SessionEnd adapter inline + enqueue -> worker later enriches`

## Config

- `ENRICHMENT_MODE=inline|async|hybrid`
- `SESSION_SUMMARY_ENABLED`
- `AUTO_DISTILL_ENABLED`
- `AUTO_DISTILL_MAX_NOTES`
- `AUTO_DISTILL_CONFIDENCE_THRESHOLD`
- `SESSION_SUMMARY_MODEL`
- `CLAUDE_SUMMARY_MODEL`, `CODEX_SUMMARY_MODEL`
- `LOCAL_SUMMARY_PROVIDER=ollama`
- `OLLAMA_HOST`, `OLLAMA_MODEL`

## Failure Behavior

- If LLM call fails, fallback heuristic summary is used.
- If git snapshot unavailable, note marks git context unavailable.
- In async mode, failures stay in queue retry lifecycle then move to failed.
