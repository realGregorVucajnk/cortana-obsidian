# Codex Hook Setup

This guide configures Codex-oriented hooks with no dependency on `~/.claude/MEMORY/*`.

## Use Codex Provider Scripts

- `hooks/providers/codex/session-end.hook.ts`
- `hooks/providers/codex/stop.hook.ts`

These adapters are transcript-first and infer metadata from transcript path/content.

## Runtime Contract

Expected stdin payload shape:

```json
{
  "session_id": "string",
  "transcript_path": "/absolute/path/to/transcript.jsonl",
  "hook_event_name": "SessionEnd|Stop"
}
```

If your Codex runtime uses different field names, normalize into this shape before invocation.

## Example Commands

```bash
bun hooks/providers/codex/session-end.hook.ts
bun hooks/providers/codex/stop.hook.ts
```

## Environment

```bash
export OBSIDIAN_VAULT=~/path/to/your/vault
export ASSISTANT_NAME=Codex
# optional
export ASSISTANT_MODEL=gpt-5-codex
```

## Notes

- No PAI/Claude memory state is required.
- Session title/type are inferred from transcript content.
- Learning capture uses the same keyword detection as Claude adapter.
