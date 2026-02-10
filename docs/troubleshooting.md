# Troubleshooting Matrix

## Symptoms

| Symptom | Likely Cause | Fix |
|--------|--------------|-----|
| Session note has metadata only | Summary disabled or enrichment fallback triggered with sparse context | Check `SESSION_SUMMARY_ENABLED=true`, verify transcript exists, inspect `summary_engine` |
| No session note created | Vault path missing or state lookup failed | Confirm `OBSIDIAN_VAULT`, verify provider setup in `HOOKS.claude.md` or `HOOKS.codex.md` |
| No recommendations/distill notes | Confidence threshold too high or low-signal session | Lower `AUTO_DISTILL_CONFIDENCE_THRESHOLD`, confirm transcript has meaningful content |
| Too many low-value distill notes | Threshold too low / max too high | Increase `AUTO_DISTILL_CONFIDENCE_THRESHOLD`, reduce `AUTO_DISTILL_MAX_NOTES` |
| Async jobs pile up | Worker not running | Start worker from runbook; inspect `.hooks-queue/failed/` |
| Codex path unexpectedly reads Claude state | Wrong script wired | Use `hooks/providers/codex/*.hook.ts` for Codex runtime |
| Claude sessions skip unexpectedly | `current-work.json` race or trivial-title filter | Verify fallback path, check title/task_count thresholds |
| LLM summary not used | Missing API key or backend unavailable | Set `OPENAI_API_KEY` or local ollama env vars |

## Quick Checks

```bash
git status
ls -la Sessions
ls -la Knowledge/learnings
ls -la .hooks-queue 2>/dev/null || true
```

## Deep Checks

1. Verify hook registration in runtime config.
2. Run provider script manually with sample stdin.
3. Inspect latest session note frontmatter for `summary_engine`.
4. For async mode, run worker once with `QUEUE_RUN_FOREVER=false`.
