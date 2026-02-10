# Claude Hook Setup

This guide configures Claude Code hooks using the provider adapter architecture.

## Install Scripts

```bash
cp hooks/session-capture.hook.ts ~/.claude/hooks/
cp hooks/learning-sync.hook.ts ~/.claude/hooks/
```

These scripts are compatibility wrappers that call:
- `hooks/providers/claude/session-end.hook.ts`
- `hooks/providers/claude/stop.hook.ts`

## Configure Claude Hooks

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "type": "command",
        "command": "bun ~/.claude/hooks/session-capture.hook.ts"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "bun ~/.claude/hooks/learning-sync.hook.ts"
      }
    ]
  }
}
```

## Behavior

- Session capture reads `~/.claude/MEMORY/STATE/current-work.json`
- If missing, it falls back to recent `~/.claude/MEMORY/WORK/*/META.yaml`
- Learning capture is transcript-driven
- Session auto-commit is opt-in (`SESSION_CAPTURE_AUTO_COMMIT=true`)

## Environment

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ASSISTANT_NAME=Claude
# optional:
export ASSISTANT_MODEL=claude-opus-4-6
export SESSION_CAPTURE_AUTO_COMMIT=false
```
