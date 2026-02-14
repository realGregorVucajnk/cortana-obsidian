# Session Intelligence Roadmap

## Phase 1 (Implemented): Method A

Status: complete.

Deliverables:
- Executive summary bullets in session notes.
- Key decisions + recommendations + digest sections.
- Git context capture.
- Auto-distill to Knowledge notes with confidence gating.

## Phase 2 (Implemented Skeleton): Method B

Status: scaffold implemented.

Deliverables:
- Queue contract and storage under `.hooks-queue/`.
- Enqueue path from SessionEnd adapters when `ENRICHMENT_MODE=async|hybrid`.
- Worker entrypoint with claim/finalize and retry lifecycle.

Hardening next:
- Persist enriched note patch-back in async mode.
- Dead-letter tooling and queue observability dashboard.
- Backoff jitter and stale-lock recovery.

## Phase 3 (Planned): Method C Hybrid

Target:
- Immediate concise inline summary.
- Async worker upgrades note quality and distills additional durable items.

Gates to ship:
- Async patch-back is stable.
- Duplicate protection on patch-back is reliable.
- Mean queue completion under acceptable threshold.

## Phase 4 (In Progress): Method D Daily Batch

Status: in progress.

Deliverables:
- Claude Desktop session discovery (local-agent-mode-sessions).
- Claude Code session discovery (history.jsonl + project transcripts).
- Daily batch extraction pipeline with LLM analysis and heuristic fallback.
- Cross-session daily digest synthesis.
- Multi-level deduplication (exact session_id, slug match, Jaccard similarity).
- Watermark-based incremental processing with stale-lock recovery.
- Knowledge note extraction with confidence gating.
- Pipeline state management (watermark.json, lock.json, run logs).

## Phase 5+ (Planned)

1. Personalized relevance ranking from user feedback.
2. Retrieval-augmented summarization using prior project notes.
3. Policy filters by domain/project sensitivity.

Note: Daily/weekly digest synthesis (previously item 4) is shipping in Phase 4.

## Tradeoffs Summary

- Method A: lowest complexity, immediate value, synchronous latency.
- Method B: resilient and scalable, more moving parts.
- Method C: best user experience, highest implementation complexity.
- Method D: broadest coverage (Code + Desktop), deepest analysis budget, batch latency.
