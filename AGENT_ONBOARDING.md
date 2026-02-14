# Agent Onboarding

This file is for AI operators working inside this repository.

## Primary objective

Create useful, durable knowledge artifacts from sessions, not raw transcript dumps.

## Required conventions

1. Follow frontmatter schema in `CLAUDE.md`.
2. Use controlled tags only.
3. Preserve provider delineation:
- Claude adapters: `hooks/providers/claude/`
- Codex adapters: `hooks/providers/codex/`
4. Do not introduce hidden coupling to `.claude/MEMORY/*` in Codex paths.

## Session note quality standard

A good note must include:
- clear executive summary bullets
- practical decisions with rationale
- concise digest
- relevant git context
- save recommendations that are actionable

## Auto-distill expectations

- Prefer fewer, high-confidence notes over many low-value notes.
- Avoid duplicates by checking existing `Knowledge/**` naming and meaning.

## Practical defaults

- Keep `ENRICHMENT_MODE=inline` unless async scaling is needed.
- Keep `AUTO_DISTILL_MAX_NOTES=3`.
- Raise confidence threshold if noise increases.

## Safety and privacy

- Keep sanitization enabled by default.
- Do not emit obvious secrets/tokens into notes.

## Docs map for agents

- `START_HERE.md`
- `README.md`
- `HOOKS.md`
- `docs/what-gets-captured.md`
- `docs/session-intelligence/roadmap.md`
- `docs/contributing-docs.md`
