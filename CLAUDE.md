# Claude Code Knowledge Vault

## Purpose

This vault is a **persistent knowledge base** that captures insights, decisions, patterns, and session summaries from working with Claude Code. It complements your AI assistant's memory system without duplicating it.

**What goes here:** Durable knowledge, decisions, patterns, learnings, and session logs worth preserving.
**What stays in PAI:** Active session state, auto-memory, working context, ephemeral notes.

## PUBLIC REPOSITORY — No PII Allowed

This is a **public template repository**. Every file committed here is visible to the internet.

**Non-negotiable rules:**
- NEVER commit real usernames, email addresses, or full names
- NEVER commit real project names from work or personal repos
- NEVER commit API keys, tokens, or secrets
- NEVER commit absolute home directory paths (use `~` or generic paths)
- Use generic examples: `acme-api`, `my-cli-tool`, `user@example.com`

**Enforcement (2 layers):**
1. **Pre-push hook** — scans all tracked files, blocks push to origin
2. **CI workflow** — `pii-scan` job runs on every push/PR, catches bypasses

No pre-commit hook (obsidian-git auto-commits would silently fail). Patterns are defined in `.pii-patterns`. Run `./scripts/install-hooks.sh` after cloning.

## Vault Conventions

### Frontmatter Schema

Every note requires this frontmatter:

```yaml
---
date: YYYY-MM-DD          # required
type: session|decision|pattern|learning|knowledge  # required
domain: work|personal|opensource  # required
status: active|completed|archived  # required
tags: []                   # required, from controlled vocabulary
summary: ""                # required, one-line description
project: ""                # optional, project name
model: ""                  # optional, Claude model used
duration_minutes:          # optional, session length
isc_satisfied:             # optional, ISC criteria met
isc_total:                 # optional, total ISC criteria
source_sessions: []        # optional, links to related sessions
category: ""               # optional, knowledge category
---
```

### Domain Taxonomy

| Domain | Maps To | Description |
|--------|---------|-------------|
| `work` | Configurable workspace dir | Work projects |
| `personal` | Configurable workspace dir | Personal projects |
| `opensource` | Configurable workspace dir | Open source contributions |

> Configure workspace directories in your hook files. The default convention is `~/work/`, `~/personal/`, `~/opensource/`.

### Controlled Tag Vocabulary

Only use these tags to keep the vault searchable and consistent:

- `cortana-session` — Session log/summary
- `knowledge` — Extracted knowledge note
- `decision` — Architectural or design decision
- `pattern` — Reusable pattern discovered
- `learning` — Lesson learned (what worked/failed)
- `research` — Research findings
- `implementation` — Implementation work
- `debugging` — Bug investigation/fix
- `review` — Code or design review
- `planning` — Planning session
- `exploration` — Codebase or concept exploration

### Folder Purposes

| Folder | Purpose |
|--------|---------|
| `Sessions/` | Chronological session logs organized by `YYYY/MM/` |
| `Knowledge/decisions/` | Architectural and design decisions |
| `Knowledge/patterns/` | Reusable patterns and approaches |
| `Knowledge/learnings/` | Lessons learned from successes and failures |
| `Projects/` | Project-specific index notes |
| `Templates/` | Templater templates for new notes |
| `Dashboards/` | Dataview-powered overview pages |
| `_archive/` | Completed or superseded notes |

### Claude Code Memory Relationship

| Claude Code Component | Vault Equivalent | Sync Direction |
|-----------------------|-----------------|----------------|
| `MEMORY.md` (auto-memory) | Session summaries | Claude Code -> Vault (via hook) |
| Working memory (context) | Not captured | N/A (ephemeral) |
| Session transcripts | `Sessions/` | Claude Code -> Vault (via hook) |
| Decision records | `Knowledge/decisions/` | Vault is source of truth |

## Hook Pipeline (Claude Adapter)

The Claude pipeline is populated by `~/.claude/hooks/session-capture.hook.ts` (SessionEnd) and `~/.claude/hooks/learning-sync.hook.ts` (Stop). These wrapper scripts delegate to `hooks/providers/claude/`.

### Data Flow

```
UserPromptSubmit → AutoWorkCreation → creates WORK/{session}/ + current-work.json
Stop → learning-sync.hook.ts → captures learning moments into Knowledge/learnings/
SessionEnd → session-capture.hook.ts → reads current-work.json or WORK/* fallback → creates Sessions/ note
```

For provider-delineated docs, see:
- `HOOKS.md`
- `HOOKS.claude.md`
- `HOOKS.codex.md`
- `docs/session-intelligence/architecture.md`
- `docs/session-intelligence/roadmap.md`
- `docs/session-intelligence/runbook.md`

### Session Capture Key Behaviors

- **Significance filter**: Skips sessions with trivial titles (acknowledgment, greeting, etc.) and `task_count < 2`. Does NOT use ISC.json criteria (those are scaffolded empty and never populated by the hook pipeline).
- **Race condition fallback**: If `current-work.json` is already deleted by `SessionSummary`, the hook falls back to scanning `WORK/` for the most recent ACTIVE/COMPLETED session.
- **Project detection**: Extracts project name from the transcript path (e.g., `~/work/my-project/` → `project: "my-project"`). Also handles encoded Claude Code paths.
- **Domain detection**: Maps transcript path to `work|personal|opensource` based on workspace directory.
- **Model detection**: Reads model from transcript metadata when present, with optional `ASSISTANT_MODEL` fallback.
- **Git commit policy**: Auto-commit is disabled by default and enabled only when `SESSION_CAPTURE_AUTO_COMMIT=true`.
- **Session intelligence**: SessionEnd supports `ENRICHMENT_MODE=inline|async|hybrid` with Method A active by default and Method B queue scaffold available.

### Learning Sync Key Behaviors

- **Learning detection**: Uses keyword analysis on the last assistant message.
- **Context mapping**: Uses transcript path to infer `domain` and `project`.
- **Collision-safe file naming**: Appends `_2`, `_3`, etc. when same-day slug already exists.

### Hook Snapshotting

Hooks are loaded at **session start**. Changes to hook files only take effect when a **new session** begins, not mid-session.

## Anti-Patterns

- **No memory duplication** — Don't copy Claude Code's auto-memory verbatim. Summarize and enrich.
- **No graph view optimization** — Don't add links just for graph aesthetics. Link when meaningful.
- **No iCloud sync** — Use git for versioning. iCloud causes sync conflicts with Obsidian.
- **No folder-based project split** — Use `domain` and `project` frontmatter, not folder hierarchies.
- **No manual dashboards** — All dashboards use Dataview queries. Never maintain lists by hand.
- **No tag sprawl** — Only use tags from the controlled vocabulary above.

## Vault Access Pattern (Two-Pass Retrieval)

When accessing vault knowledge — whether via `/recall` or ad-hoc ("look up that decision about enrichment") — follow the two-pass pattern to minimize context usage:

1. **Check auto-loaded summaries first** — VaultContextLoader already injected frontmatter summaries at session start (look for "Vault Knowledge (Auto-loaded)" in your context). If the answer is there, stop. Zero additional cost.
2. **Grep, don't bulk-read** — Use `Grep` to search `summary:` fields and note bodies for the topic. Read only the frontmatter (first 15 lines) of matches to assess relevance.
3. **Read selectively** — Only `Read` full note bodies for the 2-3 most relevant matches. Never bulk-read an entire directory.
4. **Cap at 5 full reads** — If you need more than 5 note bodies, you should be using `/recall` with filters, not ad-hoc access.

**What NOT to do:**
- Do not read every `.md` file in a directory to find information
- Do not read full note bodies when the frontmatter summary answers the question
- Do not skip the auto-loaded summaries and go straight to filesystem search
