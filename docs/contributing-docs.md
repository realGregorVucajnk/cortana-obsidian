# Contributing Documentation

## Rule: optimize for first successful run

New docs should help a new operator (human or AI) get from clone to meaningful session note quickly.

## Required sections for major docs

1. Purpose
2. Who this doc is for
3. Prerequisites
4. Exact commands or steps
5. Validation criteria
6. Troubleshooting links

## Placement rules

- Cross-provider architecture: `HOOKS.md`
- Provider-specific setup: `HOOKS.claude.md`, `HOOKS.codex.md`
- Operational behavior: `docs/session-intelligence/runbook.md`
- New-user entrypoint: `START_HERE.md`

## Naming and style

- Keep filenames explicit (`what-gets-captured.md`, not `capture.md`).
- Prefer short sections and concrete examples.
- Avoid implicit assumptions; always include defaults.

## When updating code

If behavior changes in hooks, update in the same change set:
- `README.md` documentation map
- corresponding `HOOKS*` file
- runbook and troubleshooting if runtime behavior changed
