# Hooks Package

Provider-delineated hooks for vault capture.

## Layout

- `core/` shared parsing, inference, rendering, file-writing logic
- `providers/claude/` Claude adapters (PAI-aware)
- `providers/codex/` Codex adapters (transcript-only)
- root wrappers:
  - `session-capture.hook.ts` -> Claude SessionEnd adapter
  - `learning-sync.hook.ts` -> Claude Stop adapter

## Which scripts to run

### Claude

Use root wrappers for backward compatibility:

```bash
bun hooks/session-capture.hook.ts
bun hooks/learning-sync.hook.ts
```

### Codex

Use provider scripts directly:

```bash
bun hooks/providers/codex/session-end.hook.ts
bun hooks/providers/codex/stop.hook.ts
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | `~/obsidian-vault` | Vault path |
| `ASSISTANT_NAME` | provider default | Assistant label in notes |
| `ASSISTANT_MODEL` | unset | Optional model fallback |
| `SESSION_CAPTURE_AUTO_COMMIT` | `false` | Claude session adapter only |
