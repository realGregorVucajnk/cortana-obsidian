---
date: 2026-02-10
type: pattern
domain: personal
status: active
tags:
  - pattern
  - implementation
summary: "Compatibility wrapper delegates to provider-specific adapter while preserving external interfaces"
project: "Cortana Obsidian"
---

# Hook Delegation Pattern

## Problem

You have a hook script registered in an external configuration file (e.g., `settings.json`) that you want to refactor into a modular architecture, but changing the configuration requires coordinated updates across all installations and the config is loaded at session start (snapshotting).

## Solution

Keep the original file as a **thin compatibility wrapper** that imports and delegates to the actual implementation in a provider-specific adapter.

## Structure

```
hooks/
├── session-capture.hook.ts      ← Compatibility wrapper (registered in settings.json)
├── learning-sync.hook.ts        ← Compatibility wrapper (registered in settings.json)
├── core/                        ← Shared logic
│   ├── types.ts
│   ├── render.ts
│   └── ...
└── providers/
    ├── claude/
    │   ├── session-end.hook.ts  ← Actual implementation
    │   └── stop.hook.ts
    └── codex/
        ├── session-end.hook.ts
        └── stop.hook.ts
```

## Wrapper Example

```typescript
// session-capture.hook.ts — compatibility wrapper
// This file is registered in settings.json and must keep its path stable.
// Actual implementation lives in providers/claude/session-end.hook.ts

import { handleSessionEnd } from "./providers/claude/session-end.hook";
handleSessionEnd();
```

## When to Use

- External configuration references file paths that can't be easily updated
- Configuration is snapshotted (changes only take effect on restart/new session)
- You're decomposing a monolith but need backward compatibility during the transition
- Multiple implementations (providers) need to share a common interface

## When NOT to Use

- Configuration is dynamic and easy to update
- There's only one implementation and no foreseeable need for multiple
- The indirection adds confusion for a single-developer project with no external consumers

## Trade-offs

| Pro | Con |
|-----|-----|
| Zero-downtime refactoring | One level of indirection |
| External interfaces preserved | Wrapper files feel like boilerplate |
| New providers don't touch existing code | Need to remember wrappers exist |
| Migration can be incremental | Two places to look when debugging |

## Related Notes

- [[2026-02-10_provider-adapter-architecture]] — Decision that created this pattern
- [[2026-02-10_hook-pipeline-refactoring]] — Session where it was applied
