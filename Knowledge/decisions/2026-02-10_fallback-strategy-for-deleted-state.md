---
date: 2026-02-10
type: decision
domain: personal
status: active
tags:
  - decision
  - debugging
summary: "Scan WORK/ directory as fallback when current-work.json is missing due to race conditions"
project: "Cortana Obsidian"
---

# Fallback Strategy for Deleted State

## Decision

When `current-work.json` is missing at SessionEnd, scan `~/.claude/WORK/` for the most recent `ACTIVE` or `COMPLETED` session directory instead of failing silently.

## Context

The hook pipeline has a race condition: `SessionSummary` and `ObsidianSessionCapture` both run at `SessionEnd`, but `SessionSummary` deletes `current-work.json` as part of its cleanup. When `SessionSummary` runs first (~50% of the time), `ObsidianSessionCapture` finds no state file and previously exited with `process.exit(0)` — silently producing no note.

## Options Considered

### Option A: Ordering Guarantee
- Make `SessionSummary` run after `ObsidianSessionCapture` via hook priority system
- **Pro:** Clean solution, no fallback needed
- **Con:** Claude Code's hook system doesn't support priority ordering — hooks with the same event fire in arbitrary order

### Option B: Don't Delete State File
- Have `SessionSummary` mark `current-work.json` as processed rather than deleting it
- **Pro:** Simple
- **Con:** State files accumulate, need a separate cleanup mechanism, and other hooks might depend on the deletion signal

### Option C: Fallback Scan (Chosen)
- Try `current-work.json` first (fast path)
- If missing, scan `~/.claude/WORK/*/META.yaml` for the most recent session with `status: ACTIVE` or `status: COMPLETED`
- Use that session's metadata to construct the note context
- **Pro:** Resilient to any ordering, no changes to other hooks
- **Con:** Scan is slightly slower (~50ms), could pick up wrong session in edge cases

## Rationale

Option C was chosen because:
1. **No control over hook ordering** — Claude Code fires all SessionEnd hooks in parallel
2. **Defensive design** — The fallback handles not just `SessionSummary` races but any future hook that might delete or move state files
3. **Low risk** — The WORK directory scan uses modification time to find the most recent session, which is almost always correct for the session that just ended

## Implementation

```typescript
function findRecentActiveSession(): SessionContext | null {
  const workDir = path.join(os.homedir(), ".claude", "WORK");
  const sessions = fs.readdirSync(workDir)
    .filter(d => fs.existsSync(path.join(workDir, d, "META.yaml")))
    .map(d => ({
      dir: d,
      meta: yaml.parse(fs.readFileSync(path.join(workDir, d, "META.yaml"), "utf-8")),
      mtime: fs.statSync(path.join(workDir, d)).mtimeMs
    }))
    .filter(s => s.meta.status === "ACTIVE" || s.meta.status === "COMPLETED")
    .sort((a, b) => b.mtime - a.mtime);

  return sessions[0] ? buildContext(sessions[0]) : null;
}
```

## Consequences

- `ObsidianSessionCapture` now succeeds in ~100% of sessions (up from ~50%)
- Slight risk of capturing the wrong session if two sessions end within the same second
- Pattern is reusable for any hook that needs session context but can't depend on `current-work.json`

## Action Items

- [ ] Add a unit test for the WORK directory scan with multiple concurrent sessions
- [x] Deploy fallback to `ObsidianSessionCapture`

## Related Notes

- [[2026-02-10_hook-race-conditions]] — Learning about parallel hook execution
- [[2026-02-09_hook-debugging-marathon]] — Session that discovered the race condition
- [[2026-02-09_hook-state-file-contracts]] — Learning about shared state fragility
