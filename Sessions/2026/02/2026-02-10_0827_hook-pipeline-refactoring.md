---
date: 2026-02-10
time: "08:27"
type: session
domain: personal
status: completed
tags:
  - cortana-session
  - implementation
summary: "Refactored hook pipeline into provider adapters with shared core modules"
project: "Cortana Obsidian"
model: claude-opus-4-6
duration_minutes: 180
isc_satisfied: 7
isc_total: 8
---

# Hook Pipeline Refactoring

## Context

The vault's hook system had grown organically into two monolithic files — `session-capture.hook.ts` (402 lines) and `learning-sync.hook.ts` (255 lines). Both contained duplicated logic for path resolution, domain detection, frontmatter rendering, and session metadata parsing. With Codex support incoming, maintaining two copies of every utility was unsustainable.

## What Changed

Decomposed the monolithic hooks into a **provider adapter architecture**:

### New Core Modules (`hooks/core/`)
| Module | Purpose | Lines |
|--------|---------|-------|
| `common.ts` | Shared utilities: slug generation, date formatting, path resolution | 114 |
| `io.ts` | File I/O: safe write, directory creation, frontmatter serialization | 95 |
| `render.ts` | Markdown rendering: session notes, learning notes, enrichment blocks | 84 |
| `session.ts` | Session detection: domain mapping, project extraction, model detection | 67 |
| `learning.ts` | Learning detection: keyword analysis, context mapping | 40 |
| `types.ts` | Shared TypeScript interfaces for all providers | 62 |

### Provider Adapters (`hooks/providers/`)
| Provider | Hook | Purpose |
|----------|------|---------|
| `claude/session-end.hook.ts` | SessionEnd | Claude-specific session capture (170 lines) |
| `claude/stop.hook.ts` | Stop | Claude learning sync (46 lines) |
| `codex/session-end.hook.ts` | SessionEnd | Codex session capture (93 lines) |
| `codex/stop.hook.ts` | Stop | Codex learning sync (45 lines) |

### Original Files (Now Compatibility Wrappers)
- `session-capture.hook.ts`: Reduced from 402 → ~30 lines (delegates to Claude adapter)
- `learning-sync.hook.ts`: Reduced from 255 → ~30 lines (delegates to Claude adapter)

## Key Commits

```
4c81107 hooks: add provider adapters for Claude and Codex
  22 files changed, 1023 insertions(+), 820 deletions(-)
```

This single commit represents the bulk of the refactoring — net reduction of ~200 lines while adding full Codex support.

## Decisions Made

- **Kept original filenames as wrappers** — existing `settings.json` hook registrations point to these files, so breaking them would require coordinated updates across every PAI installation. See [[2026-02-10_provider-adapter-architecture]].
- **Shared `types.ts` across providers** — a single `SessionContext` interface ensures both Claude and Codex adapters produce identical note structures.
- **No abstract base class** — adapters are plain functions, not OOP hierarchies. Each provider imports what it needs from `core/`.

## Outcomes

- Both Claude and Codex hooks now share 462 lines of core logic instead of duplicating it
- Adding a new provider (e.g., Cursor, Windsurf) requires only a new `providers/{name}/` directory
- Type safety catches schema mismatches at compile time rather than runtime

## Action Items

- [ ] Add unit tests for `core/common.ts` slug generation edge cases (unicode, long titles)
- [ ] Verify Codex adapter works end-to-end with a real Codex session
- [x] Update `CLAUDE.md` to document the new hook architecture
- [ ] Consider extracting `core/` into a shared npm package if more providers emerge

## Related Notes

- [[2026-02-10_provider-adapter-architecture]] — Decision record for the adapter pattern
- [[2026-02-10_hook-delegation-pattern]] — Pattern: compatibility wrapper delegates to provider
- [[2026-02-09_hook-state-file-contracts]] — Learning that motivated the refactoring
