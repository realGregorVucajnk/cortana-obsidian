# Claude Code Hook Integration

This vault is designed to be automatically populated by [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks). Hooks fire at specific lifecycle events and create structured Obsidian notes.

## Architecture

```
Session Start
    │
    ▼
UserPromptSubmit hook
    │  Creates MEMORY/STATE/current-work.json
    │  Tracks session_id, session_dir, task_count
    │
    ▼
[... Claude Code session runs ...]
    │
    ▼
Stop hook (after each response)
    │  ObsidianLearningSync detects learning moments
    │  Creates Knowledge/learnings/YYYY-MM-DD_slug.md
    │
    ▼
SessionEnd hook
    │  ObsidianSessionCapture reads session metadata
    │  Generates summary from thread content
    │  Creates Sessions/YYYY/MM/YYYY-MM-DD_HHMM_slug.md
    │  Git add + commit (fire-and-forget)
    │
    ▼
Done
```

## Hooks

### Session Capture (SessionEnd)

**What it does:** When a Claude Code session ends, captures session metadata, ISC criteria, and a summary into a structured Obsidian note.

**Creates:** `Sessions/YYYY/MM/YYYY-MM-DD_HHMM_{slug}.md`

**Key behaviors:**
- Reads session metadata from `~/.claude/MEMORY/WORK/` directory
- Detects domain from working directory (`~/work/` -> work, `~/personal/` -> personal, etc.)
- Detects session type from content (implementation, debugging, research, planning, etc.)
- Significance filter: skips trivial sessions (< 2 tasks and no ISC criteria)
- Auto-commits the new note to git

### Learning Sync (Stop handler)

**What it does:** After each Claude response, detects if a "learning moment" occurred and creates a knowledge note.

**Creates:** `Knowledge/learnings/YYYY-MM-DD_{slug}.md`

**Key behaviors:**
- Detects learning moments via keyword analysis in responses
- Extracts insight and evidence from structured response data
- Won't overwrite existing learning notes with the same slug

## Installation

Standalone hook implementations are in the [`hooks/`](./hooks/) directory. These have **no external dependencies** — copy them directly to your Claude Code setup.

### 1. Copy hook files

```bash
cp hooks/session-capture.hook.ts ~/.claude/hooks/
cp hooks/learning-sync.hook.ts ~/.claude/hooks/
```

### 2. Register in settings.json

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

### 3. Configure vault path

Set the `OBSIDIAN_VAULT` environment variable, or the hooks default to `~/obsidian-vault`:

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | `~/obsidian-vault` | Path to your Obsidian vault |
| Domain detection | Based on `cwd` | `~/work/` -> work, `~/personal/` -> personal, else personal |
| Significance filter | `task_count < 2 && no ISC` | Minimum threshold to create a session note |

## Hook Dependencies

The session capture hook depends on a **work tracking state file** (`current-work.json`) that records the active session. If you have your own session tracking, adapt the hook to read from your state format.

The learning sync hook is fully independent — it only reads the Claude Code transcript from stdin.

## Extending

The provided hooks are starting points. Common extensions:

- **AI summaries**: Add an inference call to generate richer session summaries
- **Project detection**: Parse `package.json` or git remote to auto-detect project names
- **Slack/Discord notifications**: Post session summaries to a channel
- **Custom significance filters**: Adjust thresholds for what constitutes a "meaningful" session
