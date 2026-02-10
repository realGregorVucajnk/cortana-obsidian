# Hook Fix Verification Checklist

**Date:** 2026-02-10
**Context:** Three fixes applied to `~/.claude/hooks/ObsidianSessionCapture.hook.ts`

## Pre-Flight

- [ ] Close ALL existing Claude Code sessions (hooks are snapshotted at session start)
- [ ] Start a NEW Claude Code session in a work project (e.g., Project Genesis)

## Test 1: Significance Filter Fix

**What broke:** Every session was rejected as "trivial" because the filter checked ISC.json criteria (never populated).

**Steps:**
1. In the new session, have a short conversation (2-3 prompts) about something real
2. Close the session
3. Check for a new file in `Sessions/2026/02/`

```bash
ls -lt ~/personal/cortana-obsidian/Sessions/2026/02/ | head -5
```

- [ ] New session note exists with today's date
- [ ] Note was NOT skipped (check debug log):
```bash
tail -20 ~/.claude/obsidian-capture-debug.log
```
- [ ] Log shows "Passed significance filter" (not "Trivial session, skipping")

## Test 2: Race Condition Fallback

**What broke:** SessionSummary deleted `current-work.json` before ObsidianSessionCapture could read it (~50% of sessions).

**Steps:**
1. Check the debug log after the session above closes
2. Look for either:
   - `current-work.json exists` (direct read worked), OR
   - `Using fallback session:` (fallback kicked in — both are OK)

```bash
grep -E "(current-work.json exists|Using fallback)" ~/.claude/obsidian-capture-debug.log | tail -5
```

- [ ] Session was captured regardless of which path was taken

## Test 3: Project Detection

**What broke:** No `project` field in notes, so "By Project" dashboard was empty.

**Steps:**
1. Open the session note created in Test 1
2. Check frontmatter for `project:` field

```bash
head -20 ~/personal/cortana-obsidian/Sessions/2026/02/2026-02-10_*.md | grep project
```

- [ ] `project:` field exists and has a reasonable value
- [ ] Open Obsidian > Dashboards > "By Project" — project appears in the table

## Test 4: Dashboard Population

**Steps:**
1. Open Obsidian
2. Check each dashboard:

- [ ] **Sessions** dashboard shows the new session note
- [ ] **By Project** dashboard shows the project grouping
- [ ] **Action Items** dashboard renders (may be empty if no tasks in notes — that's OK)

## Cleanup

After verification passes:

```bash
# Delete this file — it's a one-time checklist
rm ~/personal/cortana-obsidian/verify.md
cd ~/personal/cortana-obsidian && git add -A && git commit -m "vault backup: $(date '+%Y-%m-%d %H:%M:%S')" && git push
```

## Debug Commands (If Something Fails)

```bash
# Full debug log
cat ~/.claude/obsidian-capture-debug.log

# Check current-work.json (only exists during active session)
cat ~/.claude/MEMORY/STATE/current-work.json 2>/dev/null || echo "No active session"

# Check most recent WORK sessions
ls -lt ~/.claude/MEMORY/WORK/ | head -10

# Check what the significance filter would do
# (title must NOT match: acknowledgment, greeting, thanks, ok, yes, no, proceed, continue, got it, sounds good)
```
