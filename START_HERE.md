# Start Here

This is the fastest path to first successful capture for both humans and AI operators.

## 1) Pick your runtime

- Claude users: follow `HOOKS.claude.md`
- Codex users: follow `HOOKS.codex.md`

## 2) Set minimum environment

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ENRICHMENT_MODE=inline
export SESSION_SUMMARY_ENABLED=true
export AUTO_DISTILL_ENABLED=true
export AUTO_DISTILL_MAX_NOTES=3
export AUTO_DISTILL_CONFIDENCE_THRESHOLD=0.75
```

For remote summarization (default backend):

```bash
export OPENAI_API_KEY=...
```

Optional local summarization:

```bash
export LOCAL_SUMMARY_PROVIDER=ollama
export OLLAMA_HOST=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.1:8b
```

## 3) Register hooks

- Claude: use wrapper scripts in `HOOKS.claude.md`.
- Codex: use provider scripts in `HOOKS.codex.md`.

## 4) Run a first test session

Trigger one short coding session and let SessionEnd complete.

Expected output:
- One file in `Sessions/YYYY/MM/*.md`
- If confidence is high, 0-3 files in `Knowledge/(decisions|patterns|learnings)`

## 5) Validate output quality

Open the new session note and confirm these sections exist:
- `Executive Summary`
- `Key Decisions and Why`
- `Recommended to Save`
- `Digest`
- `Git Context`

## 6) If something looks wrong

Use:
- `docs/troubleshooting.md`
- `docs/session-intelligence/runbook.md`

## Read next

- `README.md` for full map
- `docs/what-gets-captured.md` for capture boundaries
- `AGENT_ONBOARDING.md` for AI operator conventions
