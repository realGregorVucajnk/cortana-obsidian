# Hooks Package

Provider-delineated hooks with session intelligence enrichment.

## Layout

- `core/` shared parsing, enrichment, rendering, queue utilities
- `providers/claude/` Claude adapters
- `providers/codex/` Codex adapters
- `workers/` async processing workers (Method B)
- root wrappers:
  - `session-capture.hook.ts` -> Claude SessionEnd adapter
  - `learning-sync.hook.ts` -> Claude Stop adapter

## Session Intelligence Methods

- Method A: inline enrichment (active default)
- Method B: async queue + worker (implemented scaffold)
- Method C: hybrid (documented roadmap)

## Commands

Claude wrappers:

```bash
bun hooks/session-capture.hook.ts
bun hooks/learning-sync.hook.ts
```

Codex provider scripts:

```bash
bun hooks/providers/codex/session-end.hook.ts
bun hooks/providers/codex/stop.hook.ts
```

Worker:

```bash
QUEUE_RUN_FOREVER=true bun hooks/workers/enrichment-worker.ts
```

## Docs

- `HOOKS.md`
- `HOOKS.claude.md`
- `HOOKS.codex.md`
- `docs/session-intelligence/architecture.md`
- `docs/session-intelligence/roadmap.md`
- `docs/session-intelligence/runbook.md`
