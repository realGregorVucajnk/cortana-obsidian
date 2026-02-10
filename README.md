# Obsidian AI Knowledge Vault

A template for building a persistent knowledge base that captures AI session outputs, decisions, patterns, and learnings in [Obsidian](https://obsidian.md).

## What This Does

- Auto-captures sessions via provider adapters (Claude and Codex)
- Generates human-readable session context (executive summary, decisions, digest, git context)
- Auto-distills high-confidence knowledge notes
- Provides async queue/worker scaffold for scalable enrichment
- Validates vault quality via CI checks

## Start Here

If this is your first time, begin with [`START_HERE.md`](./START_HERE.md).

## Documentation Map

| Audience | Read First | Then Read |
|----------|------------|-----------|
| Human operator | `START_HERE.md` | `HOOKS.claude.md` or `HOOKS.codex.md`, then `docs/session-intelligence/runbook.md` |
| AI operator | `AGENT_ONBOARDING.md` | `HOOKS.md`, `docs/what-gets-captured.md`, `docs/session-intelligence/roadmap.md` |
| Contributor | `README.md` | `docs/contributing-docs.md`, `CLAUDE.md`, `HOOKS.md` |

## Quick Start

1. Clone/open the repo as your Obsidian vault.
2. Pick runtime setup:
- Claude: [`HOOKS.claude.md`](./HOOKS.claude.md)
- Codex: [`HOOKS.codex.md`](./HOOKS.codex.md)
3. Set minimum env vars:

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ENRICHMENT_MODE=inline
export SESSION_SUMMARY_ENABLED=true
export AUTO_DISTILL_ENABLED=true
export OPENAI_API_KEY=...
```

## Enrichment Modes and Defaults

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENRICHMENT_MODE` | `inline` | inline now, async via queue, or hybrid |
| `SESSION_SUMMARY_ENABLED` | `true` | enable LLM/fallback summary generation |
| `AUTO_DISTILL_ENABLED` | `true` | auto-create knowledge notes |
| `AUTO_DISTILL_MAX_NOTES` | `3` | cap notes created per session |
| `AUTO_DISTILL_CONFIDENCE_THRESHOLD` | `0.75` | quality threshold for distill |
| `SESSION_SUMMARY_MODEL` | provider default | generic summary model override |
| `CLAUDE_SUMMARY_MODEL` / `CODEX_SUMMARY_MODEL` | provider defaults | provider-specific model override |
| `LOCAL_SUMMARY_PROVIDER` | unset | set `ollama` for local inference |

## What Gets Captured

See [`docs/what-gets-captured.md`](./docs/what-gets-captured.md) for exact source data, inferred fields, and exclusions.

## First-Run Validation Checklist

After your first session, verify:
1. A new file exists in `Sessions/YYYY/MM/*.md`.
2. The note includes:
- Executive Summary
- Key Decisions and Why
- Recommended to Save
- Digest
- Git Context
3. Frontmatter includes `summary_engine`, `distill_count`, `enrichment_mode`.
4. If confidence threshold is met, new notes appear under `Knowledge/`.

## Examples

- Enriched session note: [`docs/examples/session-note-enriched.md`](./docs/examples/session-note-enriched.md)
- Distilled decision note: [`docs/examples/knowledge-note-decision.md`](./docs/examples/knowledge-note-decision.md)
- Async queue job: [`docs/examples/queue-job.json`](./docs/examples/queue-job.json)

## Folder Structure

```
.
├── Sessions/
├── Knowledge/
├── Dashboards/
├── hooks/
│   ├── core/
│   ├── providers/
│   └── workers/
├── docs/
│   ├── session-intelligence/
│   └── examples/
└── .github/workflows/
```

## Core Docs

- [`CLAUDE.md`](./CLAUDE.md)
- [`HOOKS.md`](./HOOKS.md)
- [`HOOKS.claude.md`](./HOOKS.claude.md)
- [`HOOKS.codex.md`](./HOOKS.codex.md)
- [`docs/session-intelligence/architecture.md`](./docs/session-intelligence/architecture.md)
- [`docs/session-intelligence/roadmap.md`](./docs/session-intelligence/roadmap.md)
- [`docs/session-intelligence/runbook.md`](./docs/session-intelligence/runbook.md)
- [`docs/troubleshooting.md`](./docs/troubleshooting.md)
- [`docs/contributing-docs.md`](./docs/contributing-docs.md)

## License

[MIT](./LICENSE)
