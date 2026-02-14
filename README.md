# Obsidian AI Knowledge Vault

Turn your AI coding sessions into a searchable knowledge base — automatically.

## What This Is

A template repository for building a persistent knowledge base in [Obsidian](https://obsidian.md) that captures your AI-assisted coding sessions. Hooks run at session end to capture what happened, an LLM enriches the raw data into structured notes, and Obsidian renders everything with live dashboards. Works with **Claude Code** and **OpenAI Codex**.

## Features

- **Auto-capture** — No manual notes. Hooks fire at session end and create structured Markdown files
- **LLM enrichment** — Executive summaries, key decisions, digests, and git context generated automatically
- **Knowledge distillation** — Patterns, learnings, and decisions extracted from sessions as standalone notes
- **Dataview dashboards** — Browse sessions by project, date, type, or drill into decisions and action items
- **Multi-provider** — Claude Code and Codex adapters with shared intelligence core
- **Local or remote LLM** — Use OpenAI API, or run locally with Ollama

## Quick Start

### Prerequisites

- [Obsidian](https://obsidian.md) with [Dataview](https://github.com/blacksmithgu/obsidian-dataview) and [Templater](https://github.com/SilverzoneDev/Templater) plugins
- [Bun](https://bun.sh) runtime (for hooks)
- An OpenAI API key **or** local [Ollama](https://ollama.ai) installation

### Setup

1. **Clone as your Obsidian vault**
   ```bash
   git clone https://github.com/realGregorVucajnk/cortana-obsidian.git ~/my-knowledge-vault
   ```
   Open the cloned folder as a vault in Obsidian.

2. **Install hooks for your provider**
   - Claude Code: follow [`HOOKS.claude.md`](./HOOKS.claude.md)
   - OpenAI Codex: follow [`HOOKS.codex.md`](./HOOKS.codex.md)

3. **Set environment variables**
   ```bash
   export OBSIDIAN_VAULT=~/my-knowledge-vault
   export ENRICHMENT_MODE=inline
   export SESSION_SUMMARY_ENABLED=true
   export AUTO_DISTILL_ENABLED=true
   export OPENAI_API_KEY=sk-...          # or use Ollama (see below)
   ```

4. **Run a session** — After your first AI coding session, check `Sessions/` for your first note.

### Optional: Local LLM with Ollama

```bash
export LOCAL_SUMMARY_PROVIDER=ollama
export OLLAMA_HOST=http://127.0.0.1:11434
export OLLAMA_MODEL=llama3.1:8b
```

## How It Works

```
Session ends → Hook captures transcript metadata
             → LLM enriches into structured note
             → Note written to Sessions/YYYY/MM/
             → High-confidence insights distilled to Knowledge/
```

## Folder Structure

```
.
├── Sessions/              # Chronological session logs (YYYY/MM/)
├── Knowledge/
│   ├── decisions/         # Architectural and design decisions
│   ├── patterns/          # Reusable patterns discovered
│   └── learnings/         # Lessons learned
├── Projects/              # Project index notes
├── Dashboards/            # Dataview-powered live dashboards
├── Templates/             # Templater templates for manual notes
├── hooks/
│   ├── core/              # Shared enrichment intelligence
│   ├── providers/
│   │   ├── claude/        # Claude Code adapter
│   │   └── codex/         # OpenAI Codex adapter
│   └── workers/           # Async queue workers
├── docs/
│   ├── examples/          # Example notes
│   └── session-intelligence/  # Architecture and roadmap
└── .github/workflows/     # CI checks
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENRICHMENT_MODE` | `inline` | `inline`, `async` (via queue), or `hybrid` |
| `SESSION_SUMMARY_ENABLED` | `true` | Enable LLM summary generation |
| `AUTO_DISTILL_ENABLED` | `true` | Auto-create knowledge notes from sessions |
| `AUTO_DISTILL_MAX_NOTES` | `3` | Max knowledge notes per session |
| `AUTO_DISTILL_CONFIDENCE_THRESHOLD` | `0.75` | Quality threshold for distillation |
| `SESSION_SUMMARY_MODEL` | provider default | Override summary model |
| `LOCAL_SUMMARY_PROVIDER` | unset | Set to `ollama` for local inference |
| `SESSION_CAPTURE_AUTO_COMMIT` | `false` | Auto-commit notes to git (Claude only) |

See [`HOOKS.md`](./HOOKS.md) for the full environment variable reference.

## Examples

| Example | Description |
|---------|-------------|
| [`session-note-enriched.md`](./docs/examples/session-note-enriched.md) | Implementation session with full enrichment |
| [`session-note-learning.md`](./docs/examples/session-note-learning.md) | Debugging session focused on a lesson learned |
| [`knowledge-note-decision.md`](./docs/examples/knowledge-note-decision.md) | Distilled architectural decision |
| [`knowledge-note-pattern.md`](./docs/examples/knowledge-note-pattern.md) | Reusable pattern extracted from a session |
| [`knowledge-note-learning.md`](./docs/examples/knowledge-note-learning.md) | Lesson learned from a debugging session |
| [`queue-job.json`](./docs/examples/queue-job.json) | Async enrichment queue job |

## Documentation

| Audience | Start Here | Then Read |
|----------|------------|-----------|
| New user | [`START_HERE.md`](./START_HERE.md) | Provider guide, then [`docs/session-intelligence/runbook.md`](./docs/session-intelligence/runbook.md) |
| AI operator | [`AGENT_ONBOARDING.md`](./AGENT_ONBOARDING.md) | [`HOOKS.md`](./HOOKS.md), [`docs/what-gets-captured.md`](./docs/what-gets-captured.md) |
| Contributor | [`CONTRIBUTING.md`](./CONTRIBUTING.md) | [`docs/contributing-docs.md`](./docs/contributing-docs.md), [`CLAUDE.md`](./CLAUDE.md) |

## License

[MIT](./LICENSE)
