# Hook Integration

This repository now supports a **provider-delineated hook architecture**:

- Shared normalization/rendering core in `hooks/core/`
- Claude adapters in `hooks/providers/claude/`
- Codex adapters in `hooks/providers/codex/`
- Backward-compatible Claude wrapper entrypoints:
  - `hooks/session-capture.hook.ts`
  - `hooks/learning-sync.hook.ts`

## Provider Matrix

| Provider | SessionEnd Script | Stop Script | State Dependency |
|----------|-------------------|-------------|------------------|
| Claude | `hooks/providers/claude/session-end.hook.ts` | `hooks/providers/claude/stop.hook.ts` | `~/.claude/MEMORY/*` (with fallback) |
| Codex | `hooks/providers/codex/session-end.hook.ts` | `hooks/providers/codex/stop.hook.ts` | Transcript-only inference |

## Compatibility

Existing Claude hook setups do not need command changes immediately.

The root scripts:
- `hooks/session-capture.hook.ts`
- `hooks/learning-sync.hook.ts`

are wrappers that delegate to Claude adapters.

## Detailed Setup Guides

- `HOOKS.claude.md` — Claude + PAI-oriented setup and behavior
- `HOOKS.codex.md` — Codex transcript-driven setup

## Shared Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | `~/obsidian-vault` | Path to your Obsidian vault |
| `ASSISTANT_NAME` | Provider default | Assistant label written in notes |
| `ASSISTANT_MODEL` | unset | Optional model fallback in note frontmatter |

## Claude-Only Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_CAPTURE_AUTO_COMMIT` | `false` | Enable auto git add/commit for captured session notes |
