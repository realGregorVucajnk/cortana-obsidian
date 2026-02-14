# Claude Hook Setup

## Install

```bash
cp hooks/session-capture.hook.ts ~/.claude/hooks/
cp hooks/learning-sync.hook.ts ~/.claude/hooks/
```

Wrappers call Claude adapters in `hooks/providers/claude/`.

## Configure `~/.claude/settings.json`

```json
{
  "hooks": {
    "SessionEnd": [
      { "type": "command", "command": "bun ~/.claude/hooks/session-capture.hook.ts" }
    ],
    "Stop": [
      { "type": "command", "command": "bun ~/.claude/hooks/learning-sync.hook.ts" }
    ]
  }
}
```

## Behavior

- SessionEnd:
  - reads `~/.claude/MEMORY/STATE/current-work.json`
  - falls back to recent `~/.claude/MEMORY/WORK/*/META.yaml`
  - generates enriched note (Method A) unless `ENRICHMENT_MODE=async`
  - auto-distills high-confidence knowledge notes
- Stop:
  - creates learning notes from detected learning moments

## Environment

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ASSISTANT_NAME=Claude
export SESSION_CAPTURE_AUTO_COMMIT=false

# Enrichment
export ENRICHMENT_MODE=inline
export SESSION_SUMMARY_ENABLED=true
export AUTO_DISTILL_ENABLED=true
export AUTO_DISTILL_MAX_NOTES=3
export AUTO_DISTILL_CONFIDENCE_THRESHOLD=0.75

# Model routing
export CLAUDE_SUMMARY_MODEL=claude-3-5-haiku-latest
# default remote backend:
# export OPENAI_API_KEY=...
# or generic fallback
# export SESSION_SUMMARY_MODEL=...

# Optional local model
# export LOCAL_SUMMARY_PROVIDER=ollama
# export OLLAMA_HOST=http://127.0.0.1:11434
# export OLLAMA_MODEL=llama3.1:8b
```
