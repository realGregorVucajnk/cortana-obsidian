# Start Here

This is the fastest path to first successful capture for both humans and AI operators.

## Prerequisites

Before you begin, make sure you have:

- **[Obsidian](https://obsidian.md)** installed and open
- **Obsidian plugins**: [Dataview](https://github.com/blacksmithgu/obsidian-dataview) and [Templater](https://github.com/SilverzoneDev/Templater) (install from Community Plugins)
- **[Bun](https://bun.sh)** runtime installed (`curl -fsSL https://bun.sh/install | bash`)
- **An LLM provider**: either an OpenAI API key or a local [Ollama](https://ollama.ai) installation
- **An AI coding tool**: [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [OpenAI Codex](https://openai.com/codex)

## What You'll Get

After completing setup and running your first session:

- A structured session note in `Sessions/YYYY/MM/` with executive summary, decisions, digest, and git context
- Optionally, 0-3 distilled knowledge notes in `Knowledge/` (decisions, patterns, or learnings)
- Live dashboards in Obsidian showing your sessions, decisions, and project activity

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

## 3.5) Install PII detection hooks

```bash
./scripts/install-hooks.sh
```

This enables pre-push scanning for accidental PII leaks. Required for public repos.

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

Common issues and fixes:

- **No session note created?** Check that `OBSIDIAN_VAULT` points to this vault and hooks are registered. See [`docs/troubleshooting.md`](./docs/troubleshooting.md).
- **Note created but no enrichment?** Verify `OPENAI_API_KEY` is set (or Ollama is running). Check `SESSION_SUMMARY_ENABLED=true`.
- **Dashboards empty?** Enable JavaScript queries in Dataview plugin settings.

For deeper debugging: [`docs/session-intelligence/runbook.md`](./docs/session-intelligence/runbook.md)

## Read next

- [`README.md`](./README.md) for full project overview
- [`docs/what-gets-captured.md`](./docs/what-gets-captured.md) for capture boundaries
- [`AGENT_ONBOARDING.md`](./AGENT_ONBOARDING.md) for AI operator conventions
