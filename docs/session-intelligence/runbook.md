# Session Intelligence Runbook

## Modes

- `inline` (default): SessionEnd performs enrichment immediately.
- `async`: SessionEnd enqueues jobs; worker processes later.
- `hybrid`: SessionEnd does inline and enqueues.

## Recommended Defaults

```bash
export ENRICHMENT_MODE=inline
export SESSION_SUMMARY_ENABLED=true
export AUTO_DISTILL_ENABLED=true
export AUTO_DISTILL_MAX_NOTES=3
export AUTO_DISTILL_CONFIDENCE_THRESHOLD=0.75
```

## Model Routing

Provider-specific:
- `CLAUDE_SUMMARY_MODEL`
- `CODEX_SUMMARY_MODEL`

Generic fallback:
- `SESSION_SUMMARY_MODEL`

Default remote backend auth:
- `OPENAI_API_KEY`
- optional `OPENAI_BASE_URL`

Local model option:

```bash
export LOCAL_SUMMARY_PROVIDER=ollama
export OLLAMA_HOST=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.1:8b
```

## Worker Operations (Method B)

Run once (drain until no pending jobs):

```bash
QUEUE_RUN_FOREVER=false bun hooks/workers/enrichment-worker.ts
```

Run continuously:

```bash
QUEUE_RUN_FOREVER=true QUEUE_POLL_MS=2000 bun hooks/workers/enrichment-worker.ts
```

## Queue Paths

Under vault root:
- `.hooks-queue/pending`
- `.hooks-queue/processing`
- `.hooks-queue/done`
- `.hooks-queue/failed`
- `.hooks-queue/results`

## Troubleshooting

1. No enrichment text in notes:
- Check `SESSION_SUMMARY_ENABLED=true`.
- Verify model credentials/endpoint.
- Check fallback by inspecting `summary_engine` frontmatter.

2. Too many knowledge notes:
- Increase `AUTO_DISTILL_CONFIDENCE_THRESHOLD`.
- Lower `AUTO_DISTILL_MAX_NOTES`.

3. Queue not draining:
- Ensure worker is running.
- Inspect `.hooks-queue/failed/*.json` for error reasons.
