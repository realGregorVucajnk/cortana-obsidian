# Hook Debug Context (2026-02-09)

## Problem
Zero session notes captured in Obsidian vault despite hooks being registered.

## What We Found

### Bug 1: SessionEnd hooks — possibly only first hook in multi-hook array runs
- Settings.json had 3 hooks in one `hooks` array under SessionEnd
- WorkCompletionLearning (position 1) produces output
- ObsidianSessionCapture (position 2) — zero captures
- SessionSummary (position 3) — META.yaml stuck at ACTIVE
- **Fix applied**: Split each hook into its own entry in settings.json

### Bug 2: SessionSummary — schema mismatch (same as earlier ObsidianSessionCapture bug)
- Used `work_dir`/`item_count` instead of `session_dir`/`task_count`
- Could never update META.yaml → all sessions stuck at ACTIVE
- Still unconditionally deleted current-work.json
- **Fix applied**: Updated interface + usage sites in SessionSummary.hook.ts

### What's confirmed working
- Hook code is correct — manual test creates notes successfully
- Hook is registered in settings.json
- PAI_DIR env var resolves correctly
- current-work.json exists and has correct schema
- Many past sessions qualify (task_count >= 2 with ISC)

## Debug Instrumentation Added
- `ObsidianSessionCapture.hook.ts` now writes to `~/.claude/obsidian-capture-debug.log`
- Every decision point is logged (stdin read, vault check, current-work parse, significance filter, note creation)

## How to Verify (Next Session)

1. End this session (fixes are snapshotted at session START, so next session gets them)
2. Start a new session, do some work (enough for task_count >= 2)
3. End that session
4. Check: `cat ~/.claude/obsidian-capture-debug.log`
5. Check: `find ~/personal/cortana-obsidian/Sessions -name "*.md"`

## Files Modified

| File | Change |
|------|--------|
| `~/.claude/settings.json` | Split SessionEnd hooks into separate entries |
| `~/.claude/hooks/SessionSummary.hook.ts` | Fixed work_dir→session_dir, item_count→task_count |
| `~/.claude/hooks/ObsidianSessionCapture.hook.ts` | Added debug file logging at every decision point |

## Manual Test Command

```bash
# Simulate a SessionEnd (swap current-work.json temporarily)
cp ~/.claude/MEMORY/STATE/current-work.json /tmp/cw-backup.json
cat > ~/.claude/MEMORY/STATE/current-work.json << 'EOF'
{
  "session_id": "test-123",
  "session_dir": "REPLACE_WITH_REAL_SESSION_DIR",
  "current_task": "001_task",
  "task_count": 3,
  "created_at": "2026-02-09T17:00:00-05:00"
}
EOF
echo '{"session_id":"test","transcript_path":"/tmp/test","hook_event_name":"SessionEnd"}' | bun ~/.claude/hooks/ObsidianSessionCapture.hook.ts
cp /tmp/cw-backup.json ~/.claude/MEMORY/STATE/current-work.json
cat ~/.claude/obsidian-capture-debug.log
```
