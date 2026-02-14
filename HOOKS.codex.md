# Codex Hook Setup

Codex adapters are transcript-first and do not depend on `.claude/MEMORY/*`.

## Use Scripts

- `hooks/providers/codex/session-end.hook.ts`
- `hooks/providers/codex/stop.hook.ts`

## Expected stdin payload

```json
{
  "session_id": "string",
  "transcript_path": "/absolute/path/to/transcript.jsonl",
  "hook_event_name": "SessionEnd|Stop"
}
```

## Environment

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ASSISTANT_NAME=Codex

# Enrichment
export ENRICHMENT_MODE=inline
export SESSION_SUMMARY_ENABLED=true
export AUTO_DISTILL_ENABLED=true
export AUTO_DISTILL_MAX_NOTES=3
export AUTO_DISTILL_CONFIDENCE_THRESHOLD=0.75

# Model routing
export CODEX_SUMMARY_MODEL=gpt-4.1-mini
# default remote backend:
# export OPENAI_API_KEY=...
# or generic fallback
# export SESSION_SUMMARY_MODEL=...

# Optional local model
# export LOCAL_SUMMARY_PROVIDER=ollama
# export OLLAMA_HOST=http://127.0.0.1:11434
# export OLLAMA_MODEL=llama3.1:8b
```

## Method B Worker (optional)

If using async/hybrid modes, run worker:

```bash
QUEUE_RUN_FOREVER=true bun hooks/workers/enrichment-worker.ts
```
