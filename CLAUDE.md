# Claude Code Knowledge Vault

## Purpose

This vault is a **persistent knowledge base** that captures insights, decisions, patterns, and session summaries from working with Claude Code. It complements your AI assistant's memory system without duplicating it.

**What goes here:** Durable knowledge, decisions, patterns, learnings, and session logs worth preserving.
**What stays in PAI:** Active session state, auto-memory, working context, ephemeral notes.

## Vault Conventions

### Frontmatter Schema

Every note requires this frontmatter:

```yaml
---
date: YYYY-MM-DD          # required
type: session|decision|pattern|learning|knowledge  # required
domain: work|personal|opensource  # required
status: active|completed|archived  # required
tags: []                   # required, from controlled vocabulary
summary: ""                # required, one-line description
project: ""                # optional, project name
model: ""                  # optional, Claude model used
duration_minutes:          # optional, session length
isc_satisfied:             # optional, ISC criteria met
isc_total:                 # optional, total ISC criteria
source_sessions: []        # optional, links to related sessions
category: ""               # optional, knowledge category
---
```

### Domain Taxonomy

| Domain | Maps To | Description |
|--------|---------|-------------|
| `work` | Configurable workspace dir | Work projects |
| `personal` | Configurable workspace dir | Personal projects |
| `opensource` | Configurable workspace dir | Open source contributions |

> Configure workspace directories in your hook files. The default convention is `~/work/`, `~/personal/`, `~/opensource/`.

### Controlled Tag Vocabulary

Only use these tags to keep the vault searchable and consistent:

- `cortana-session` — Session log/summary
- `knowledge` — Extracted knowledge note
- `decision` — Architectural or design decision
- `pattern` — Reusable pattern discovered
- `learning` — Lesson learned (what worked/failed)
- `research` — Research findings
- `implementation` — Implementation work
- `debugging` — Bug investigation/fix
- `review` — Code or design review
- `planning` — Planning session
- `exploration` — Codebase or concept exploration

### Folder Purposes

| Folder | Purpose |
|--------|---------|
| `Sessions/` | Chronological session logs organized by `YYYY/MM/` |
| `Knowledge/decisions/` | Architectural and design decisions |
| `Knowledge/patterns/` | Reusable patterns and approaches |
| `Knowledge/learnings/` | Lessons learned from successes and failures |
| `Projects/` | Project-specific index notes |
| `Templates/` | Templater templates for new notes |
| `Dashboards/` | Dataview-powered overview pages |
| `_archive/` | Completed or superseded notes |

### Claude Code Memory Relationship

| Claude Code Component | Vault Equivalent | Sync Direction |
|-----------------------|-----------------|----------------|
| `MEMORY.md` (auto-memory) | Session summaries | Claude Code -> Vault (via hook) |
| Working memory (context) | Not captured | N/A (ephemeral) |
| Session transcripts | `Sessions/` | Claude Code -> Vault (via hook) |
| Decision records | `Knowledge/decisions/` | Vault is source of truth |

## Anti-Patterns

- **No memory duplication** — Don't copy Claude Code's auto-memory verbatim. Summarize and enrich.
- **No graph view optimization** — Don't add links just for graph aesthetics. Link when meaningful.
- **No iCloud sync** — Use git for versioning. iCloud causes sync conflicts with Obsidian.
- **No folder-based project split** — Use `domain` and `project` frontmatter, not folder hierarchies.
- **No manual dashboards** — All dashboards use Dataview queries. Never maintain lists by hand.
- **No tag sprawl** — Only use tags from the controlled vocabulary above.
