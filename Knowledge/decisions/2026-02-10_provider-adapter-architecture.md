---
date: 2026-02-10
type: decision
domain: personal
status: active
tags:
  - decision
  - implementation
summary: "Chose provider adapter pattern over configurable monolith for multi-tool hook support"
project: "Cortana Obsidian"
---

# Provider Adapter Architecture

## Decision

Use separate provider adapters (`hooks/providers/{tool}/`) that call shared core modules, rather than a single configurable hook script with tool-specific branches.

## Context

The vault's hook pipeline needed to support multiple AI coding tools (Claude Code, Codex CLI, potentially Cursor/Windsurf). The original implementation was a monolithic `session-capture.hook.ts` that assumed Claude Code's event model, file paths, and transcript format.

## Options Considered

### Option A: Configurable Monolith
- Single `session-capture.hook.ts` with a `PROVIDER` env var
- `if (provider === "claude") { ... } else if (provider === "codex") { ... }`
- **Pro:** One file to maintain
- **Con:** Increasingly complex conditionals, hard to test per-provider, violates Open/Closed principle

### Option B: Provider Adapters (Chosen)
- Shared core modules in `hooks/core/` (types, rendering, I/O, session detection)
- Thin adapters in `hooks/providers/{tool}/` that map tool-specific events to core functions
- Original files become compatibility wrappers
- **Pro:** Each adapter is independently testable, new providers don't touch existing code
- **Con:** More files, need to keep core interfaces stable

### Option C: Plugin System
- Dynamic loading of provider modules at runtime
- `hooks/plugins/claude.ts`, `hooks/plugins/codex.ts`
- **Pro:** Most extensible
- **Con:** Over-engineered for 2-3 providers, runtime discovery adds failure modes

## Rationale

Option B was chosen because:
1. **Incremental complexity** — Each adapter is ~50-170 lines, easy to understand in isolation
2. **Type safety** — Shared `SessionContext` interface catches incompatibilities at compile time
3. **Backward compatibility** — Original files as wrappers means zero changes to `settings.json` hook registrations
4. **Test isolation** — Can test Claude adapter without Codex installed, and vice versa

## Consequences

- Adding a new provider requires: new directory, ~50 lines adapter, hook registration
- Core interface changes require updating all adapters (currently 2)
- Compatibility wrappers add one level of indirection for Claude hooks

## Action Items

- [ ] Document the "how to add a new provider" process in `docs/contributing-docs.md`
- [x] Implement adapters for Claude and Codex

## Related Notes

- [[2026-02-10_0827_hook-pipeline-refactoring]] — Session where this was implemented
- [[2026-02-10_hook-delegation-pattern]] — Pattern: wrapper delegates to adapter
- [[2026-02-10_1530_project-genesis-research]] — Research into other tools' hook systems
