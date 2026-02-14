Review recent session notes from the vault and extract durable knowledge worth preserving.

## What to Do

1. **Read session notes** from `Sessions/` for the specified period (default: last 7 days). Use Glob to find `Sessions/**/*.md` and read each note.

2. **Identify extractable knowledge** across three categories:
   - **Decisions** — Architectural or design choices that should guide future work (e.g., "Use REST not GraphQL for this API", "Deploy to Fly.io not Vercel")
   - **Patterns** — Reusable approaches or techniques worth remembering (e.g., "Bun spawn needs explicit stdio config", "Use fire-and-forget git commits in hooks")
   - **Learnings** — Lessons from what worked or failed (e.g., "Frontmatter parsing is faster than full YAML parse for simple fields")

3. **Check for duplicates** — Before creating a new note, scan existing files in `Knowledge/decisions/`, `Knowledge/patterns/`, and `Knowledge/learnings/` to avoid duplicating knowledge that already exists.

4. **Create Knowledge notes** with proper frontmatter for each unique insight:

```markdown
---
date: YYYY-MM-DD
type: decision|pattern|learning
domain: work|personal|opensource
status: active
tags:
  - [appropriate tag from: knowledge, decision, pattern, learning]
summary: "One-line description of the insight"
project: "project-name-if-applicable"
source_sessions:
  - "[[YYYY-MM-DD_HHMM_session-slug]]"
---

# Title

## Context

[What situation led to this insight]

## Insight

[The actual decision/pattern/learning]

## Rationale

[Why this matters for future work]
```

5. **File naming**: Use `YYYY-MM-DD_slug.md` format in the appropriate `Knowledge/` subdirectory.

6. **Git commit** the new notes: `git add Knowledge/ && git commit -m "distill: extract knowledge from recent sessions"`

## Quality Filters

- Only extract insights that are **durable** — they should be useful weeks or months from now
- Skip session-specific details (timestamps, ISC counts, specific file paths)
- Skip trivial sessions with no meaningful output
- Prefer **concrete and actionable** insights over vague observations
- Each note should be self-contained — readable without the source session

## Arguments

If the user provides a time range (e.g., `/distill last 30 days`), use that instead of the default 7 days. If the user provides a project name (e.g., `/distill cortana-obsidian`), filter sessions to that project/domain only.
