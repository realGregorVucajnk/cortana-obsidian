# Hook Integration

## Glossary

| Term | Definition |
|------|-----------|
| **Vault** | The Obsidian folder (this repo) where all notes live |
| **Hook** | A script that runs automatically at a specific lifecycle event (e.g., session end) |
| **Provider adapter** | Runtime-specific hook code (Claude or Codex) that reads transcript data |
| **Enrichment** | LLM-powered processing that turns raw session data into structured summaries |
| **Session intelligence** | The overall pipeline: capture, enrich, distill |
| **Distillation** | Extracting standalone knowledge notes (decisions, patterns, learnings) from a session |

## Architecture

This repo uses a provider-delineated hook stack:

- Shared intelligence core: `hooks/core/`
- Claude adapters: `hooks/providers/claude/`
- Codex adapters: `hooks/providers/codex/`
- Claude compatibility wrappers:
  - `hooks/session-capture.hook.ts`
  - `hooks/learning-sync.hook.ts`

## Session Intelligence Methods

- Method A (active): inline SessionEnd enrichment + auto-distill.
- Method B (implemented scaffold): async queue + worker flow.
- Method C (planned): hybrid inline + async upgrade path.

Roadmap/docs:
- `docs/session-intelligence/architecture.md`
- `docs/session-intelligence/roadmap.md`
- `docs/session-intelligence/runbook.md`

## Provider Matrix

| Provider | SessionEnd | Stop | State Dependency |
|----------|------------|------|------------------|
| Claude | `hooks/providers/claude/session-end.hook.ts` | `hooks/providers/claude/stop.hook.ts` | `~/.claude/MEMORY/*` (fallback supported) |
| Codex | `hooks/providers/codex/session-end.hook.ts` | `hooks/providers/codex/stop.hook.ts` | Transcript-first |

## Enrichment Modes

| Mode | Behavior |
|------|----------|
| `inline` | SessionEnd computes enrichment immediately and writes enriched note |
| `async` | SessionEnd enqueues enrichment job; worker processes queue |
| `hybrid` | SessionEnd does inline enrichment and also enqueues async job |

## Environment Variables

Shared:
- `OBSIDIAN_VAULT`
- `ASSISTANT_NAME`
- `ASSISTANT_MODEL`

Enrichment controls:
- `ENRICHMENT_MODE=inline|async|hybrid`
- `SESSION_SUMMARY_ENABLED=true|false`
- `AUTO_DISTILL_ENABLED=true|false`
- `AUTO_DISTILL_MAX_NOTES`
- `AUTO_DISTILL_CONFIDENCE_THRESHOLD`
- `SESSION_SUMMARY_MODEL`
- `CLAUDE_SUMMARY_MODEL`
- `CODEX_SUMMARY_MODEL`
- `OPENAI_API_KEY` (for default OpenAI-compatible summary calls)
- `OPENAI_BASE_URL` (optional custom OpenAI-compatible endpoint)
- `LOCAL_SUMMARY_PROVIDER=ollama`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`

Claude-only:
- `SESSION_CAPTURE_AUTO_COMMIT=true|false`

Queue/worker:
- `QUEUE_RUN_FOREVER=true|false`
- `QUEUE_POLL_MS`
- `QUEUE_MAX_ATTEMPTS`
- `QUEUE_BACKOFF_MS`
