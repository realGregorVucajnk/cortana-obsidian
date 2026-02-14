Search the Obsidian vault for relevant knowledge using two-pass retrieval: search cheap first, then read selectively. Context is precious — never bulk-read.

## Arguments

- `/recall` — General: synthesize from auto-loaded summaries, surface open action items
- `/recall <topic>` — Topic: grep vault for the topic, present matches, read selectively
- `/recall --project "Name"` — Project: filter by `project:` frontmatter field
- `/recall --domain work|personal|opensource` — Domain: restrict to one domain
- `/recall --since 7d` — Time: only notes from last N days (default: 30)
- Combinable: `/recall hooks --project "Cortana Obsidian" --since 7d`

## The Vault

```
~/personal/cortana-obsidian/
├── Sessions/YYYY/MM/          ← Session logs (type: session)
├── Knowledge/decisions/       ← Architectural decisions (type: decision)
├── Knowledge/patterns/        ← Reusable patterns (type: pattern)
├── Knowledge/learnings/       ← Lessons learned (type: learning)
├── Dashboards/                ← SKIP (Dataview queries, not knowledge)
├── Templates/                 ← SKIP (Templater syntax)
└── _archive/                  ← SKIP unless explicitly requested
```

Searchable frontmatter fields: `date`, `type`, `domain`, `status`, `tags`, `summary`, `project`

## Pass 1 — Cheap Search

**Goal:** Find candidate notes without reading full bodies. Budget: ~50-100 tokens per match.

1. **Check auto-loaded summaries first.** Scan your context for the "Vault Knowledge (Auto-loaded)" system reminder. If the query can be answered from those summaries alone (e.g., "what decisions are active?"), skip to the Briefing — no filesystem reads needed.

2. **If a topic/project/domain argument is provided**, search the filesystem:
   - Use **Grep** to search `summary:` lines and note body text across `Sessions/` and `Knowledge/` for the topic
   - For `--project` filtering, grep for `^project:.*"<Name>"` in frontmatter
   - For `--domain` filtering, grep for `^domain: <value>` in frontmatter
   - For `--since`, filter by `^date:` values within the time range

3. **For each match, read only the frontmatter** (first 15 lines via `Read` with `limit: 15`). Extract: filename, date, type, domain, project, summary.

4. **Rank and cap results:**
   - Topic appears in `summary:` field → higher rank
   - Topic appears in body text → lower rank
   - `status: active` → higher rank than `completed` or `archived`
   - More recent → higher rank
   - **Cap at 10 candidates.** If more than 10 matches, show top 10 and note how many were omitted. Suggest narrowing with `--project`, `--domain`, or `--since`.

5. **Present candidates to the user:**

```
Found N notes matching "topic":

| # | Date       | Type     | Project          | Summary                              |
|---|------------|----------|------------------|--------------------------------------|
| 1 | 2026-02-10 | decision | Cortana Obsidian | Provider adapter over configurable... |
| 2 | 2026-02-10 | learning | Cortana Obsidian | Parallel hooks need fallback...       |

Read which? (default: top 3, max 5)
```

6. **Wait for user input** before proceeding to Pass 2. The user may say:
   - "1, 3" → read those specific notes
   - "all" → read all candidates (up to 5)
   - "go" or no specific selection → read the top 3
   - "none, try X instead" → re-run Pass 1 with a different query

This confirmation gate is the key to context budget control.

## Pass 2 — Selective Deep Read

**Goal:** Load full note bodies for selected notes. Budget: ~200-500 tokens per note.

1. **Read full content** of each selected note using the Read tool. Do not summarize or truncate — load the complete body.
2. **Hard cap: 5 notes.** If the user requests more, read the 5 most relevant. Note which were skipped.

## Briefing — Synthesized Output

After reading (or if auto-loaded summaries suffice), produce:

```markdown
## Vault Recall: <query or "General Review">

### Active Decisions
- [Decision] — [status and key constraint]

### Open Action Items
- [ ] [task] — from [[note-name]]

### Patterns to Reuse
- [Pattern] — [when to apply]

### Mistakes to Avoid
- [Learning] — [what went wrong + prevention]

### Key Context
[2-3 sentences: most important takeaway for current work]
```

Omit any section with no entries. Only include what was found in vault notes — do not fabricate.

## Edge Cases

- **0 matches:** Report vault size ("The vault has N sessions, N decisions, N patterns, N learnings"). Suggest broadening: different spelling, related terms, or `/recall` without filters.
- **Auto-loaded summaries sufficient:** Skip Pass 2 entirely. Note: "All relevant knowledge already in context via VaultContextLoader — no additional reads needed."
- **Very broad query (20+ grep hits):** Show top 10, tell user N more exist, suggest `--project` or `--since` to narrow.
- **No arguments (`/recall`):** Synthesize directly from auto-loaded summaries. Surface any open `[ ]` action items by grepping `Sessions/` and `Knowledge/` for unchecked tasks (grep pattern: `- \[ \]`). Cap at 10 action items.
