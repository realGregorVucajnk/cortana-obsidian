# Session Intelligence Architecture

## Goal

Generate meaningful, human-readable session context automatically while preserving provider-specific compatibility. Four complementary methods handle real-time, async, hybrid, and batch processing to ensure every session produces durable vault knowledge.

---

## Methods

### Method A — Inline (Active Default)

Synchronous enrichment at SessionEnd. Hooks fire when a session closes, read the transcript, call an LLM within a 12-second timeout budget, and write enriched notes directly into the vault.

**Trigger:** SessionEnd hook event.
**Latency:** 2-12 seconds (LLM-dependent).
**Code:** `hooks/providers/claude/session-end.hook.ts`, `hooks/providers/codex/session-end.hook.ts`, `hooks/core/session-intelligence.ts`.

Flow:
1. Provider adapter collects transcript, thread/task data, and git snapshot.
2. `runSessionIntelligence()` calls LLM summary pipeline (with heuristic fallback on failure).
3. `renderSessionNote()` writes enriched Markdown to `Sessions/YYYY/MM/`.
4. Auto-distill extracts high-confidence knowledge notes to `Knowledge/`.

### Method B — Async Queue (Scaffold Implemented)

Queue-based deferred enrichment. SessionEnd enqueues a job instead of processing inline. A background worker claims jobs from `.hooks-queue/`, processes with a longer timeout budget, and writes results.

**Trigger:** SessionEnd when `ENRICHMENT_MODE=async|hybrid`.
**Code:** `hooks/core/queue/` (types, store, enqueue), `hooks/workers/enrichment-worker.ts`.

Flow:
1. SessionEnd adapter enqueues enrichment job to `.hooks-queue/pending/`.
2. Worker claims job (moves to `processing/`).
3. Worker processes with extended timeout, writes note artifacts.
4. Job moves to `done/` (or `failed/` with retry lifecycle).

### Method C — Hybrid (Planned)

Combines inline immediacy with async depth. SessionEnd writes an immediate concise summary (fast path), then enqueues a job for the worker to upgrade note quality with deeper analysis.

**Gates to ship:** Async patch-back stable, duplicate protection reliable, mean queue completion acceptable.

### Method D — Daily Batch (In Progress)

Daily cron job that discovers ALL sessions across Claude Code and Claude Desktop, runs deeper analysis than Method A can within its 12-second budget, deduplicates against existing vault notes, and writes session summaries, knowledge extractions, and daily digest notes.

**Trigger:** Cron schedule or manual invocation.
**Code:** `hooks/pipeline/` (discovery, analysis, dedup, output, state), entry point `hooks/pipeline/daily-extract.ts`.

Flow:
1. **Discovery** — Scan Claude Code and Claude Desktop session stores for new sessions since last watermark.
2. **Analysis** — Read and chunk transcripts, call LLM for structured extraction (summary, decisions, patterns, learnings).
3. **Dedup** — Compare extracted content against existing vault notes using multi-level similarity.
4. **Output** — Write session notes, knowledge notes, and daily digest to vault.
5. **State Update** — Advance watermark timestamps, log run metadata.

---

## Data Sources

### Claude Code

| Artifact | Path | Format |
|----------|------|--------|
| Session index | `~/.claude/history.jsonl` | JSONL — one object per session with `sessionId`, `path`, `startTime` |
| Transcript | `~/.claude/projects/{encoded-path}/{sessionId}.jsonl` | JSONL — message objects with `role`, `content`, `tool_use`, `tool_result` |
| WORK tracking | `~/.claude/MEMORY/WORK/{dated-dir}/META.yaml` | YAML — session metadata, status, task count |

**Encoded path:** Claude Code URL-encodes the project directory (e.g., `/Users/gregor/personal/cortana-obsidian` becomes `-Users-gregor-personal-cortana-obsidian`).

### Claude Desktop

| Artifact | Path | Format |
|----------|------|--------|
| Session metadata | `~/Library/Application Support/Claude/local-agent-mode-sessions/{device-id}/{browser-id}/local_{session-id}.json` | JSON — session config, title, model |
| Transcript | `~/Library/Application Support/Claude/local-agent-mode-sessions/{device-id}/{browser-id}/{session-id}/audit.jsonl` | JSONL — audit log of messages and tool calls |

**Discovery:** Enumerate `{device-id}/{browser-id}/` directories, glob for `local_*.json` metadata files, parse session IDs, then locate corresponding `{session-id}/audit.jsonl` transcripts.

---

## Pipeline Component Map (Method D)

| Component | Path | Purpose |
|-----------|------|---------|
| **Discovery** | `hooks/pipeline/discovery/` | Find new sessions from Code and Desktop sources since last watermark |
| — Types | `hooks/pipeline/discovery/types.ts` | Shared `DiscoveredSession` interface, source enum |
| — Claude Code | `hooks/pipeline/discovery/claude-code.ts` | Parse `history.jsonl`, resolve transcript paths, filter by watermark |
| — Claude Desktop | `hooks/pipeline/discovery/claude-desktop.ts` | Enumerate local-agent-mode-sessions, parse metadata + audit logs |
| **Analysis** | `hooks/pipeline/analysis/` | Parse transcripts into structured extractions via LLM |
| — Transcript Reader | `hooks/pipeline/analysis/transcript-reader.ts` | Read JSONL transcripts, normalize Code vs Desktop formats |
| — Chunker | `hooks/pipeline/analysis/chunker.ts` | Split long transcripts into LLM-sized chunks with overlap |
| — Prompts | `hooks/pipeline/analysis/prompts.ts` | LLM prompt templates for extraction tasks |
| — Extract | `hooks/pipeline/analysis/extract.ts` | Orchestrate chunked LLM calls, merge chunk results |
| **Dedup** | `hooks/pipeline/dedup/` | Prevent duplicate notes in the vault |
| — Vault Index | `hooks/pipeline/dedup/vault-index.ts` | Build index of existing session notes (session_id, slug, word tokens) |
| — Similarity | `hooks/pipeline/dedup/similarity.ts` | Multi-level dedup: exact ID, slug match, Jaccard similarity |
| **Output** | `hooks/pipeline/output/` | Write notes to the vault in correct format |
| — Session Writer | `hooks/pipeline/output/session-writer.ts` | Render session summary notes with frontmatter to `Sessions/` |
| — Knowledge Writer | `hooks/pipeline/output/knowledge-writer.ts` | Render knowledge/decision/pattern/learning notes to `Knowledge/` |
| — Digest Writer | `hooks/pipeline/output/digest-writer.ts` | Render daily digest note aggregating the day's sessions |
| **State** | `hooks/pipeline/state/` | Track processing progress across runs |
| — Watermark | `hooks/pipeline/state/watermark.ts` | Read/write watermark.json with per-source timestamps and session IDs |
| — Lock | `hooks/pipeline/state/lock.ts` | Acquire/release lock.json to prevent concurrent pipeline runs |
| **Entry** | `hooks/pipeline/daily-extract.ts` | Main orchestrator: discovery -> analysis -> dedup -> output -> state |
| **Core (shared)** | `hooks/core/` | Utilities shared between Methods A-D |
| — LLM | `hooks/core/llm.ts` | Model routing (Claude/Codex/Ollama via config) |
| — Render | `hooks/core/render.ts` | Markdown rendering with frontmatter |
| — Sanitize | `hooks/core/sanitize.ts` | Content sanitization and slug generation |
| — IO | `hooks/core/io.ts` | File read/write helpers |
| — Git | `hooks/core/git.ts` | Repository snapshot collection |
| — Types | `hooks/core/types.ts` | Shared type definitions |
| — Session Intelligence | `hooks/core/session-intelligence.ts` | LLM + heuristic fallback, recommendation scoring, auto-distill |

---

## Pipeline Data Flow (Method D)

```
                    ┌─────────────┐
                    │   Cron /    │
                    │  Manual Run │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Lock Check │──── locked? → exit
                    └──────┬──────┘
                           │ acquired
                    ┌──────▼──────┐
                    │  Read       │
                    │  Watermark  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
     ┌────────▼────────┐     ┌─────────▼─────────┐
     │  Discover Code  │     │ Discover Desktop  │
     │  Sessions       │     │ Sessions          │
     └────────┬────────┘     └─────────┬─────────┘
              │                         │
              └────────────┬────────────┘
                           │ merged session list
                    ┌──────▼──────┐
                    │  For each   │
                    │  session:   │
                    │             │
                    │  1. Read    │
                    │  2. Chunk   │
                    │  3. Extract │
                    │  4. Dedup   │
                    │  5. Write   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Write Daily │
                    │ Digest Note │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Update     │
                    │  Watermark  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Release    │
                    │  Lock       │
                    └─────────────┘
```

---

## State Management

All pipeline state lives under `.pipeline-state/` in the vault root (gitignored — local machine state only).

### watermark.json

Tracks the last successfully processed session per source to enable incremental runs.

```json
{
  "claude_code": {
    "last_timestamp": "2026-02-12T10:30:00Z",
    "last_session_id": "abc-123",
    "total_processed": 47
  },
  "claude_desktop": {
    "last_timestamp": "2026-02-12T09:15:00Z",
    "last_session_id": "def-456",
    "total_processed": 12
  }
}
```

### lock.json

Prevents concurrent pipeline runs. Contains PID and start time for stale detection.

```json
{
  "pid": 12345,
  "started_at": "2026-02-12T11:00:00Z",
  "hostname": "gregor-mbp"
}
```

### runs/

Directory of per-run log files named `{ISO-timestamp}.json`. Each contains:
- Sessions discovered, processed, skipped, and failed counts.
- Per-session processing time and outcome.
- Total run duration.

---

## Deduplication Strategy

Three levels, checked in order (first match wins):

1. **Exact session_id match** — If a vault note's `session_id` frontmatter field matches a discovered session, skip it. Cheapest check.

2. **Filename slug match** — If the generated filename slug (from session title) matches an existing file in the target `Sessions/YYYY/MM/` directory, skip it. Catches renamed or re-processed sessions.

3. **Jaccard word-token similarity** — Tokenize the generated summary into word tokens. Compare against existing notes in the same date range. If Jaccard similarity exceeds **0.7 threshold**, treat as duplicate and skip. Catches sessions that were captured by Method A with a slightly different title or summary.

---

## Integration: Methods A + D

Method A and Method D are complementary, not competing:

| Concern | Method A (Inline) | Method D (Daily Batch) |
|---------|-------------------|----------------------|
| **Trigger** | SessionEnd hook event | Cron or manual |
| **Sources** | Current provider only (Claude Code or Codex) | All sources (Code + Desktop) |
| **Latency** | 2-12 seconds | Minutes (batch) |
| **LLM budget** | 12-second timeout | Unconstrained |
| **Desktop coverage** | None | Full |
| **Gap filling** | N/A | Catches failed Method A runs |
| **Knowledge extraction** | Auto-distill (single session) | Cross-session patterns and digest |
| **Digest** | None | Daily digest note |

Method D runs daily to:
1. Capture Desktop sessions that Method A never sees.
2. Fill gaps from failed or skipped Method A runs.
3. Extract additional knowledge from sessions Method A already captured (deeper analysis budget).
4. Create daily digest notes aggregating the day's sessions.

---

## Error Handling

### Per-Session Isolation

Each session is processed in its own try/catch block. A failure in one session does not abort the pipeline — remaining sessions continue processing. Failed sessions are logged in the run report with error details.

### LLM Failure Fallback

If the LLM call fails (timeout, rate limit, network error), the pipeline falls back to heuristic extraction:
- Summary: first user message + assistant response structure.
- Decisions/patterns/learnings: keyword-based detection in transcript text.
- Confidence scores are marked as `heuristic` to distinguish from LLM-extracted content.

### Stale Lock Recovery

On startup, the pipeline checks if `lock.json` exists. If it does:
1. Read the PID from the lock file.
2. Check if that PID is still alive (`kill -0 {pid}`).
3. If the process is dead, treat the lock as stale, log a warning, and acquire a new lock.
4. If the process is alive, exit with a message indicating another run is in progress.

### Corrupt Watermark

If `watermark.json` is missing or unparseable:
- Treat as a first run: discover all sessions within the backfill window (`PIPELINE_BACKFILL_DAYS`).
- Vault-level dedup prevents duplicate notes even on a full re-scan.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | `~/personal/cortana-obsidian` | Path to the Obsidian vault root |
| `PIPELINE_DRY_RUN` | `false` | When `true`, log what would be written but don't create files |
| `PIPELINE_BACKFILL_DAYS` | `7` | On first run or corrupt watermark, how many days back to scan |
| `PIPELINE_MAX_SESSIONS` | `50` | Maximum sessions to process per run (prevents runaway LLM costs) |
| `PIPELINE_LLM_DELAY_MS` | `500` | Delay between LLM calls to respect rate limits |
| `PIPELINE_LLM_TIMEOUT_MS` | `30000` | Per-session LLM timeout (longer than Method A's 12s budget) |
| `PIPELINE_SIGNIFICANCE_THRESHOLD` | `2` | Minimum task count for a session to be considered significant |
| `PIPELINE_KNOWLEDGE_CONFIDENCE` | `0.75` | Minimum confidence score to auto-create knowledge notes |
| `PIPELINE_AUTO_COMMIT` | `false` | When `true`, auto-commit new vault notes after each run |
| `ENRICHMENT_MODE` | `inline` | Method A/B/C selector: `inline`, `async`, or `hybrid` |
| `SESSION_SUMMARY_ENABLED` | `true` | Enable LLM-based session summarization |
| `AUTO_DISTILL_ENABLED` | `true` | Enable auto-distill of knowledge notes |
| `AUTO_DISTILL_MAX_NOTES` | `3` | Maximum knowledge notes per session |
| `AUTO_DISTILL_CONFIDENCE_THRESHOLD` | `0.75` | Confidence threshold for auto-distill |
| `SESSION_SUMMARY_MODEL` | — | Generic model override for summaries |
| `CLAUDE_SUMMARY_MODEL` | — | Claude-specific summary model |
| `CODEX_SUMMARY_MODEL` | — | Codex-specific summary model |
| `LOCAL_SUMMARY_PROVIDER` | — | Set to `ollama` to use local model |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server address |
| `OLLAMA_MODEL` | — | Ollama model name |

---

## Directory Structure

```
cortana-obsidian/
├── hooks/
│   ├── core/                          # Shared utilities (Methods A-D)
│   │   ├── common.ts
│   │   ├── git.ts
│   │   ├── io.ts
│   │   ├── learning.ts
│   │   ├── llm.ts
│   │   ├── render.ts
│   │   ├── sanitize.ts
│   │   ├── session-intelligence.ts
│   │   ├── session.ts
│   │   ├── types.ts
│   │   └── queue/                     # Method B queue
│   │       ├── enqueue.ts
│   │       ├── store.ts
│   │       └── types.ts
│   ├── pipeline/                      # Method D daily batch
│   │   ├── daily-extract.ts           # Main orchestrator
│   │   ├── discovery/
│   │   │   ├── types.ts
│   │   │   ├── claude-code.ts
│   │   │   └── claude-desktop.ts
│   │   ├── analysis/
│   │   │   ├── transcript-reader.ts
│   │   │   ├── chunker.ts
│   │   │   ├── prompts.ts
│   │   │   └── extract.ts
│   │   ├── dedup/
│   │   │   ├── vault-index.ts
│   │   │   └── similarity.ts
│   │   ├── output/
│   │   │   ├── session-writer.ts
│   │   │   ├── knowledge-writer.ts
│   │   │   └── digest-writer.ts
│   │   └── state/
│   │       ├── watermark.ts
│   │       └── lock.ts
│   ├── providers/                     # Method A provider adapters
│   │   ├── claude/
│   │   │   ├── session-end.hook.ts
│   │   │   └── stop.hook.ts
│   │   └── codex/
│   │       ├── session-end.hook.ts
│   │       └── stop.hook.ts
│   ├── workers/                       # Method B worker
│   │   └── enrichment-worker.ts
│   ├── learning-sync.hook.ts
│   └── session-capture.hook.ts
├── .pipeline-state/                   # Local state (gitignored)
│   ├── watermark.json
│   ├── lock.json
│   └── runs/
├── .hooks-queue/                      # Method B queue (gitignored)
│   ├── pending/
│   ├── processing/
│   ├── done/
│   └── failed/
├── Sessions/                          # Vault output
├── Knowledge/
├── Dashboards/
└── docs/session-intelligence/
    ├── architecture.md                # This file
    ├── roadmap.md
    └── runbook.md
```

---

## Failure Behavior Summary

| Failure | Impact | Recovery |
|---------|--------|----------|
| LLM timeout | Single session | Heuristic fallback, session still processed |
| LLM rate limit | Pipeline paused | Exponential backoff with `PIPELINE_LLM_DELAY_MS` |
| Corrupt transcript | Single session | Skip with error log, continue pipeline |
| Stale lock | Pipeline blocked | PID liveness check, auto-recover if process dead |
| Corrupt watermark | Full re-scan | Backfill window limits scope, dedup prevents duplicates |
| Disk full | Pipeline aborted | Pre-flight check on available space |
| Missing Desktop dir | No Desktop sessions | Warning logged, Code sessions still processed |
