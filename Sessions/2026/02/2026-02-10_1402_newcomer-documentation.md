---
date: 2026-02-10
time: "14:02"
type: session
domain: personal
status: completed
tags:
  - cortana-session
  - implementation
summary: "Created newcomer onboarding docs with progressive disclosure layers"
project: "Cortana Obsidian"
model: claude-opus-4-6
duration_minutes: 90
isc_satisfied: 5
isc_total: 5
---

# Newcomer Documentation

## Context

The cortana-obsidian repo is public (a template for others to fork), but the only entry point was `README.md` which jumped straight into architecture details. A newcomer cloning the repo would face 20+ files with no clear "start here" path. The hook system documentation was scattered across `HOOKS.md`, `HOOKS.claude.md`, `HOOKS.codex.md`, and inline comments.

## What Was Created

### New Files

| File | Purpose | Lines |
|------|---------|-------|
| `START_HERE.md` | First-touch guide: what the vault is, what you need, 5-step setup | 67 |
| `AGENT_ONBOARDING.md` | For AI agents (Claude, Codex): vault conventions, do/don't, quick reference | 50 |
| `docs/what-gets-captured.md` | Explains the full data flow from session → hook → note | 56 |
| `docs/troubleshooting.md` | Common issues with hooks, Obsidian, git sync | 30 |
| `docs/contributing-docs.md` | How to contribute: PR workflow, doc standards, template usage | 34 |
| `docs/examples/session-note-enriched.md` | Example of a fully enriched session note | 52 |
| `docs/examples/knowledge-note-decision.md` | Example of a decision knowledge note | 27 |
| `docs/examples/queue-job.json` | Example async enrichment queue job | 22 |

**Total: 338 new lines of documentation across 8 files** (commit `98ccc47`).

### README Restructured

The README was restructured from a flat wall of text to a layered navigation hub:

```
README.md (83 insertions, 57 deletions)
  ├── Quick Start (links to START_HERE.md)
  ├── For AI Agents (links to AGENT_ONBOARDING.md)
  ├── Architecture Overview (brief, links to docs/)
  └── Documentation Map (table linking all docs)
```

Commit `78bcd67`: `docs: add newcomer documentation map and first-run checklist`

## Documentation Pattern Applied

Used **progressive disclosure** — see [[2026-02-10_progressive-disclosure-documentation]]:

| Layer | Audience | Depth |
|-------|----------|-------|
| START_HERE.md | Brand new user | "What is this?" + 5 setup steps |
| README.md | Returning user | Architecture overview + navigation |
| HOOKS.md | Developer | Full hook system reference |
| docs/session-intelligence/ | Contributor | Implementation details + runbook |

## Action Items

- [ ] Add screenshots of Obsidian with populated dashboards to START_HERE.md
- [x] Cross-link all docs bidirectionally
- [ ] Create a GitHub issue template for "I set this up and X doesn't work"

## Related Notes

- [[2026-02-10_progressive-disclosure-documentation]] — Pattern used for doc layering
- [[2026-02-10_0827_hook-pipeline-refactoring]] — The system being documented
