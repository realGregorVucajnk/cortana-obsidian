# What Gets Captured

This page defines exactly what data is used to generate notes.

## Session note inputs

1. Hook event payload (`session_id`, `transcript_path`, event type).
2. Provider state:
- Claude: `~/.claude/MEMORY/STATE/current-work.json` plus fallback to `~/.claude/MEMORY/WORK/*/META.yaml`.
- Codex: transcript-first inference (no `.claude` dependency).
3. Transcript excerpts (bounded recent lines).
4. Thread/task content where available.
5. Git snapshot from repository context.

## Derived fields (inferred)

- `domain` and `project` from transcript path/cwd conventions.
- `session_type` from content classification heuristics.
- recommendations and distill candidates from summary pipeline.

## Not captured by default

- Full raw transcript dump in session note.
- Binary artifacts.
- External services data unrelated to the session context.
- Secret values intentionally (sanitization tries to redact obvious patterns).

## Enrichment outputs

Session notes may include:
- Executive summary bullets
- Key decisions and rationale
- Recommended-to-save items
- Digest
- Git context

Frontmatter enrichment metadata:
- `summary_engine`
- `summary_model`
- `distill_count`
- `enrichment_mode`

## Knowledge auto-distill outputs

When enabled and confidence threshold is met:
- `Knowledge/decisions/*.md`
- `Knowledge/patterns/*.md`
- `Knowledge/learnings/*.md`

Each note links back via `source_sessions`.

## Mode differences

- `inline`: enrichment at SessionEnd.
- `async`: queue job created; worker handles enrichment.
- `hybrid`: immediate note + queued follow-up.
