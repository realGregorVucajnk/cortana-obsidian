---
date: 2026-02-10
time: "15:30"
type: session
domain: personal
status: completed
tags:
  - cortana-session
  - research
summary: "Researched hook architectures across AI coding tools for Project Genesis integration patterns"
project: "Project Genesis"
model: claude-opus-4-6
duration_minutes: 75
isc_satisfied: 4
isc_total: 5
---

# Project Genesis Research

## Context

Project Genesis is the umbrella project for PAI system improvements. This research session investigated how different AI coding assistants (Claude Code, Codex CLI, Cursor, Windsurf, Aider) implement their hook/extension systems, to inform the design of a universal adapter layer in PAI.

## Findings

### Hook System Comparison

| Tool | Hook Mechanism | Event Types | Config Location |
|------|---------------|-------------|-----------------|
| **Claude Code** | `settings.json` matchers → shell commands | UserPromptSubmit, SessionEnd, Stop, SubagentStart/Stop, NotebookEdit | `~/.claude/settings.json` |
| **Codex CLI** | Environment-based hooks | SessionStart, SessionEnd, ToolCall | `.codex/hooks/` |
| **Cursor** | Extension API (VS Code-based) | File change, terminal, chat events | VS Code extension manifest |
| **Aider** | Pre/post command hooks | Pre-commit, post-edit, lint | `.aider.conf.yml` |
| **Windsurf** | Cascade rules + custom actions | File edit, terminal, chat | `.windsurfrules` |

### Key Observations

1. **No standard hook interface exists** — Every tool has its own event model, configuration format, and execution environment. A universal adapter needs to map tool-specific events to a common event vocabulary.

2. **Claude Code has the richest event model** — 6+ event types with full context (transcript path, session ID, tool inputs). Most other tools only expose 2-3 event types.

3. **File-based state sharing is fragile** — Both Claude Code and Codex use filesystem state (`current-work.json`, `META.yaml`) for inter-hook communication. This creates the race conditions documented in [[2026-02-10_hook-race-conditions]].

4. **VS Code-based tools have different constraints** — Cursor and Windsurf run in a VS Code extension host, which means hooks execute in Node.js with access to the VS Code API but not arbitrary shell commands.

## Proposed Universal Event Model

```typescript
interface PAIEvent {
  source: "claude" | "codex" | "cursor" | "aider" | "windsurf";
  type: "session.start" | "session.end" | "file.change" | "tool.call" | "learning";
  timestamp: string;
  context: {
    project?: string;
    domain?: string;
    model?: string;
    transcript_path?: string;
  };
  payload: Record<string, unknown>;
}
```

This normalizes across tools while preserving tool-specific data in `payload`.

## Action Items

- [ ] Draft the universal adapter interface as a TypeScript module
- [ ] Map Claude Code's 6 event types to the universal model
- [ ] Test with Codex CLI's session events as second provider

## Related Notes

- [[2026-02-10_hook-pipeline-refactoring]] — Current Claude-specific adapter that would become one provider
- [[2026-02-10_provider-adapter-architecture]] — Decision that enables multi-provider support
- [[2026-02-10_fallback-strategy-for-deleted-state]] — File-based state problems observed here too
