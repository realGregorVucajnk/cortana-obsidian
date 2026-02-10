# Obsidian + Claude Code Knowledge Vault

A template for building a persistent knowledge base that automatically captures [Claude Code](https://docs.anthropic.com/en/docs/claude-code) session outputs, decisions, patterns, and learnings in [Obsidian](https://obsidian.md).

## What This Does

- **Auto-captures sessions** — Claude Code hooks create structured Obsidian notes at session end
- **Dashboards** — Dataview-powered views of sessions by date, domain, project, and type
- **Knowledge distillation** — Extract durable insights from session logs into reusable knowledge notes
- **Vault health** — GitHub Actions validates frontmatter, tags, and detects orphan notes

## Quick Start

1. Use this template or clone the repo
2. Open the folder as a vault in Obsidian
3. Install required plugins (Obsidian will prompt — manifests are pre-configured)
4. Copy hook files to your Claude Code setup (see [HOOKS.md](./HOOKS.md))

## Folder Structure

```
.
├── Sessions/           # Chronological session logs (YYYY/MM/)
├── Knowledge/
│   ├── decisions/      # Architectural and design decisions
│   ├── patterns/       # Reusable patterns discovered
│   └── learnings/      # Lessons learned from successes and failures
├── Projects/           # Project-specific index notes
├── Templates/          # Templater templates for note creation
├── Dashboards/         # Dataview-powered overview pages
├── _archive/           # Completed or superseded notes
├── hooks/              # Standalone Claude Code hook examples
├── .github/workflows/  # Vault health CI
└── .obsidian/          # Plugin configs (manifests + settings, no bundles)
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — Vault conventions, frontmatter schema, controlled tags
- **[HOOKS.md](./HOOKS.md)** — Claude Code hook setup and configuration
- **[hooks/](./hooks/)** — Standalone hook implementations (copy to `~/.claude/hooks/`)

## Required Plugins

| Plugin | Purpose |
|--------|---------|
| [Dataview](https://github.com/blacksmithgu/obsidian-dataview) | Powers all dashboard queries |
| [Templater](https://github.com/SilentVoid13/Templater) | Dynamic templates for manual note creation |
| [Calendar](https://github.com/liamcain/obsidian-calendar-plugin) | Visual daily note navigation |
| [obsidian-git](https://github.com/Vinzent03/obsidian-git) | Auto git sync |

Plugin manifests are included so Obsidian knows which versions to install. The actual plugin code is not bundled — Obsidian will download it on first open.

## Frontmatter Schema

Every note uses a consistent frontmatter schema defined in [CLAUDE.md](./CLAUDE.md). Required fields:

```yaml
date: 2026-01-15
type: session        # session | decision | pattern | learning | knowledge
domain: personal     # work | personal | opensource
status: completed    # active | completed | archived
tags: [cortana-session, implementation]
summary: "One-line description of what happened"
```

## GitHub Actions

The included workflow (`.github/workflows/vault-health.yml`) runs weekly and on push to validate:
- Required frontmatter fields on all session notes
- Tags against the controlled vocabulary
- Orphan note detection (notes with no inbound links)
- Archive candidates (completed sessions older than 90 days)
- Vault statistics dashboard auto-update

## License

[MIT](./LICENSE)
