# Claude Code Hooks

Standalone hook implementations for automatic Obsidian note capture. These have **no external dependencies** beyond Bun.

## Setup

### 1. Copy hooks to Claude Code

```bash
cp session-capture.hook.ts ~/.claude/hooks/
cp learning-sync.hook.ts ~/.claude/hooks/
```

### 2. Add to `~/.claude/settings.json`

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

### 3. Set vault path

```bash
# In your shell profile (~/.zshrc, ~/.bashrc, etc.)
export OBSIDIAN_VAULT=~/path/to/your/vault
```

If not set, hooks default to `~/obsidian-vault`.

## How It Works

### session-capture.hook.ts

Fires at **SessionEnd**. Reads session metadata from `~/.claude/MEMORY/WORK/` and creates a structured note in `Sessions/YYYY/MM/`.

**Requires:** A work-tracking system that writes `~/.claude/MEMORY/STATE/current-work.json` with session metadata. If you don't have one, you'll need to create a UserPromptSubmit hook that populates this file, or adapt the session capture hook to read from your own state format.

### learning-sync.hook.ts

Fires at **Stop** (after each Claude response). Reads the transcript, checks for learning-related keywords, and creates a knowledge note in `Knowledge/learnings/`.

**Requires:** Nothing beyond the transcript path provided via stdin.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | `~/obsidian-vault` | Path to your Obsidian vault |
| `ASSISTANT_NAME` | `Claude` | Name shown in session notes |

## Extending

These hooks are starting points. To add AI-powered summaries, replace the `summary = title` line in `session-capture.hook.ts` with a call to your preferred inference API.
