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

## Phase 4+ (Planned)

1. Personalized relevance ranking from user feedback.
2. Retrieval-augmented summarization using prior project notes.
3. Policy filters by domain/project sensitivity.
4. Daily/weekly digest synthesis from session intelligence outputs.

## Tradeoffs Summary

- Method A: lowest complexity, immediate value, synchronous latency.
- Method B: resilient and scalable, more moving parts.
- Method C: best user experience, highest implementation complexity.
