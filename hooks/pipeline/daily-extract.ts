#!/usr/bin/env bun
/**
 * Daily Knowledge Extraction Pipeline
 *
 * Discovers sessions from Claude Code and Claude Desktop, extracts structured
 * knowledge via LLM analysis, deduplicates against existing vault notes, and
 * writes session notes, knowledge notes, and daily digests.
 *
 * Usage:
 *   bun hooks/pipeline/daily-extract.ts
 *
 * Environment variables:
 *   OBSIDIAN_VAULT              — vault path (default: ~/personal/cortana-obsidian)
 *   PIPELINE_DRY_RUN            — "true" to skip writes (default: false)
 *   PIPELINE_BACKFILL_DAYS      — days to look back on first run (default: 1)
 *   PIPELINE_MAX_SESSIONS       — max sessions per run (default: 50)
 *   PIPELINE_LLM_DELAY_MS       — delay between LLM calls (default: 1000)
 *   PIPELINE_LLM_TIMEOUT_MS     — LLM call timeout (default: 30000)
 *   PIPELINE_SIGNIFICANCE_THRESHOLD — min significance to write session note (default: 0.3)
 *   PIPELINE_KNOWLEDGE_CONFIDENCE   — min confidence for knowledge notes (default: 0.75)
 *   PIPELINE_AUTO_COMMIT        — "true" to git commit after run (default: false)
 *   PIPELINE_LLM_MODEL          — Claude model for analysis (default: claude-haiku-4-5-20251001)
 *
 * Prerequisites:
 *   - Claude Code CLI installed and authenticated (`claude` in PATH)
 */

import { join, basename } from 'path';
import { homedir } from 'os';
import { writeFileSync } from 'fs';

// Discovery
import { discoverCodeSessions } from './discovery/claude-code';
import { discoverDesktopSessions } from './discovery/claude-desktop';
import type { DiscoveredSession, SourceType } from './discovery/types';

// Analysis
import { extractSessionKnowledge } from './analysis/extract';
import type { ExtractionResult } from './analysis/extract';
import { buildDigestPrompt } from './analysis/prompts';

// Dedup
import { buildVaultIndex } from './dedup/vault-index';
import type { VaultIndex } from './dedup/vault-index';
import { isDuplicateSession } from './dedup/similarity';

// Output
import { writeSessionNote } from './output/session-writer';
import { writeKnowledgeNotes } from './output/knowledge-writer';
import { writeDigestNote } from './output/digest-writer';

// State
import {
  readWatermark,
  writeWatermark,
  updateWatermarkForSession,
  getDefaultWatermark,
} from './state/watermark';
import type { WatermarkState } from './state/watermark';
import { acquireLock, releaseLock } from './state/lock';

// Core
import { isTrivialTitle, getDateString, getISOTimestamp } from '../core/common';
import { ensureDir } from '../core/io';

const TAG = '[daily-extract]';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface PipelineConfig {
  vaultPath: string;
  stateDir: string;
  dryRun: boolean;
  backfillDays: number;
  maxSessions: number;
  llmDelayMs: number;
  llmTimeoutMs: number;
  significanceThreshold: number;
  knowledgeConfidence: number;
  autoCommit: boolean;
}

function parseConfig(): PipelineConfig {
  const vaultPath =
    process.env.OBSIDIAN_VAULT || join(homedir(), 'personal', 'cortana-obsidian');
  return {
    vaultPath,
    stateDir: join(vaultPath, '.pipeline-state'),
    dryRun: process.env.PIPELINE_DRY_RUN === 'true',
    backfillDays: Number(process.env.PIPELINE_BACKFILL_DAYS) || 1,
    maxSessions: Number(process.env.PIPELINE_MAX_SESSIONS) || 50,
    llmDelayMs: Number(process.env.PIPELINE_LLM_DELAY_MS) || 1000,
    llmTimeoutMs: Number(process.env.PIPELINE_LLM_TIMEOUT_MS) || 30_000,
    significanceThreshold: Number(process.env.PIPELINE_SIGNIFICANCE_THRESHOLD) || 0.3,
    knowledgeConfidence: Number(process.env.PIPELINE_KNOWLEDGE_CONFIDENCE) || 0.75,
    autoCommit: process.env.PIPELINE_AUTO_COMMIT === 'true',
  };
}

// ---------------------------------------------------------------------------
// Source type mapping
// ---------------------------------------------------------------------------

function sourceToWatermarkKey(source: SourceType): 'claudeCode' | 'claudeDesktop' {
  return source === 'claude-code' ? 'claudeCode' : 'claudeDesktop';
}

// ---------------------------------------------------------------------------
// LLM via headless Claude CLI (uses existing OAuth session — no API key needed)
// ---------------------------------------------------------------------------

async function callLLM(prompt: string, timeoutMs: number): Promise<string> {
  const model = process.env.PIPELINE_LLM_MODEL || 'claude-haiku-4-5-20251001';

  const proc = Bun.spawn(
    ['claude', '-p', '--model', model, '--output-format', 'text'],
    { stdin: new Response(prompt), stdout: 'pipe', stderr: 'pipe', timeout: timeoutMs },
  );

  const [output, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`claude CLI exited ${exitCode}: ${stderr.slice(0, 200)}`);
  }

  return output;
}

function safeParse<T>(text: string): T | null {
  const trimmed = text.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) return null;
  try {
    return JSON.parse(trimmed.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Run summary logger
// ---------------------------------------------------------------------------

interface RunSummary {
  startedAt: string;
  completedAt: string;
  config: Omit<PipelineConfig, 'stateDir'>;
  discovered: number;
  filtered: number;
  processed: number;
  duplicateSkipped: number;
  belowThresholdSkipped: number;
  sessionNotesWritten: number;
  knowledgeNotesWritten: number;
  digestsWritten: number;
  errors: string[];
}

function writeRunSummary(stateDir: string, summary: RunSummary): void {
  const runsDir = join(stateDir, 'runs');
  ensureDir(runsDir);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filePath = join(runsDir, `${stamp}.json`);
  writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
  console.error(`${TAG} run summary written to ${filePath}`);
}

// ---------------------------------------------------------------------------
// Git commit helper
// ---------------------------------------------------------------------------

async function gitCommit(vaultPath: string): Promise<void> {
  try {
    const date = getDateString();
    const result = Bun.spawnSync(
      ['git', 'add', '-A'],
      { cwd: vaultPath, stderr: 'pipe', stdout: 'pipe' },
    );
    if (result.exitCode !== 0) {
      console.error(`${TAG} git add failed: ${result.stderr.toString()}`);
      return;
    }

    const commitResult = Bun.spawnSync(
      ['git', 'commit', '-m', `pipeline: daily extraction ${date}`],
      { cwd: vaultPath, stderr: 'pipe', stdout: 'pipe' },
    );
    if (commitResult.exitCode !== 0) {
      const stderr = commitResult.stderr.toString();
      if (stderr.includes('nothing to commit')) {
        console.error(`${TAG} no changes to commit`);
      } else {
        console.error(`${TAG} git commit failed: ${stderr}`);
      }
    } else {
      console.error(`${TAG} committed vault changes`);
    }
  } catch (err) {
    console.error(`${TAG} git commit error:`, err);
  }
}

// ---------------------------------------------------------------------------
// Delay helper
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startedAt = getISOTimestamp();
  console.error(`${TAG} ===== Pipeline starting at ${startedAt} =====`);

  // 1. Parse config
  const config = parseConfig();
  console.error(`${TAG} vault: ${config.vaultPath}`);
  console.error(`${TAG} dry-run: ${config.dryRun}`);

  // 2. Acquire lock
  if (!acquireLock(config.stateDir)) {
    console.error(`${TAG} another instance is running, exiting`);
    process.exit(1);
  }

  const errors: string[] = [];
  let sessionNotesWritten = 0;
  let knowledgeNotesWritten = 0;
  let digestsWritten = 0;
  let duplicateSkipped = 0;
  let belowThresholdSkipped = 0;

  try {
    // 3. Read or create watermark
    let watermark = readWatermark(config.stateDir);
    if (!watermark) {
      console.error(`${TAG} no watermark found, creating default (backfill: ${config.backfillDays} days)`);
      watermark = getDefaultWatermark(config.backfillDays);
      writeWatermark(config.stateDir, watermark);
    }

    // 4. Discover sessions from both sources
    console.error(`${TAG} discovering sessions...`);
    const codeSessions = discoverCodeSessions(
      watermark.sources.claudeCode.lastProcessedTimestamp,
    );
    const desktopSessions = discoverDesktopSessions(
      watermark.sources.claudeDesktop.lastProcessedTimestamp,
    );
    const allDiscovered = [...codeSessions, ...desktopSessions];
    console.error(`${TAG} discovered ${allDiscovered.length} total (code: ${codeSessions.length}, desktop: ${desktopSessions.length})`);

    // 5. Filter trivial titles and already-processed sessions
    const allProcessedIds = new Set([
      ...watermark.sources.claudeCode.processedSessionIds,
      ...watermark.sources.claudeDesktop.processedSessionIds,
    ]);

    const candidates = allDiscovered.filter((s) => {
      if (isTrivialTitle(s.title)) {
        return false;
      }
      if (allProcessedIds.has(s.id)) {
        return false;
      }
      return true;
    });

    console.error(`${TAG} after filtering: ${candidates.length} candidates (${allDiscovered.length - candidates.length} filtered)`);

    // 6. Sort by creation time and cap
    candidates.sort((a, b) => a.createdAt - b.createdAt);
    const toProcess = candidates.slice(0, config.maxSessions);
    if (candidates.length > config.maxSessions) {
      console.error(`${TAG} capped at ${config.maxSessions} (${candidates.length - config.maxSessions} deferred)`);
    }

    // 7. Build vault index for dedup
    console.error(`${TAG} building vault index...`);
    const vaultIndex: VaultIndex = buildVaultIndex(config.vaultPath);

    // 8. Process each session sequentially
    const processed: Array<{
      session: DiscoveredSession;
      extraction: ExtractionResult;
      sessionNotePath: string | null;
      date: string;
    }> = [];

    for (let i = 0; i < toProcess.length; i++) {
      const session = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.error(`${TAG} ${progress} processing: "${session.title}" (${session.source})`);

        // 8a. Check if session already exists in vault
        if (isDuplicateSession(session.id, vaultIndex)) {
          console.error(`${TAG} ${progress} duplicate session, skipping note write`);
          duplicateSkipped++;
          watermark = updateWatermarkForSession(
            watermark,
            sourceToWatermarkKey(session.source),
            session.id,
            session.createdAt,
          );
          continue;
        }

        // 8b. Extract knowledge
        const extraction = await extractSessionKnowledge(session, {
          llmTimeout: config.llmTimeoutMs,
          delayMs: config.llmDelayMs,
          dryRun: config.dryRun,
        });

        // 8c. Filter by significance threshold
        if (extraction.significance < config.significanceThreshold) {
          console.error(
            `${TAG} ${progress} below significance threshold (${extraction.significance} < ${config.significanceThreshold}), skipping`,
          );
          belowThresholdSkipped++;
          watermark = updateWatermarkForSession(
            watermark,
            sourceToWatermarkKey(session.source),
            session.id,
            session.createdAt,
          );
          continue;
        }

        // 8d. Write session note
        const sessionNotePath = writeSessionNote({
          session,
          extraction,
          vaultPath: config.vaultPath,
          dryRun: config.dryRun,
        });

        if (sessionNotePath) {
          sessionNotesWritten++;
          watermark.stats.totalNotesCreated++;
        }

        // 8e. Write knowledge notes (decisions, patterns, learnings)
        const sessionFilename = sessionNotePath ? basename(sessionNotePath) : `${session.id}.md`;
        const knowledgePaths = writeKnowledgeNotes({
          patterns: extraction.patterns,
          learnings: extraction.learnings,
          decisions: extraction.key_decisions,
          sourceSessionFilename: sessionFilename,
          domain: session.domain,
          project: session.project,
          vaultPath: config.vaultPath,
          confidenceThreshold: config.knowledgeConfidence,
          vaultIndex,
          dryRun: config.dryRun,
        });

        knowledgeNotesWritten += knowledgePaths.length;
        watermark.stats.totalKnowledgeExtracted += knowledgePaths.length;

        // 8f. Update watermark
        watermark = updateWatermarkForSession(
          watermark,
          sourceToWatermarkKey(session.source),
          session.id,
          session.createdAt,
        );

        const date = getDateString(new Date(session.createdAt).toISOString());
        processed.push({ session, extraction, sessionNotePath, date });

        // Rate limit between sessions
        if (i < toProcess.length - 1 && config.llmDelayMs > 0) {
          await delay(config.llmDelayMs);
        }
      } catch (err) {
        const msg = `Error processing session "${session.title}" (${session.id}): ${err}`;
        console.error(`${TAG} ${progress} ${msg}`);
        errors.push(msg);

        // Still mark as processed to avoid retrying broken sessions
        watermark = updateWatermarkForSession(
          watermark,
          sourceToWatermarkKey(session.source),
          session.id,
          session.createdAt,
        );
      }
    }

    // 9. Generate daily digests for dates with 2+ sessions
    console.error(`${TAG} generating digests...`);
    const byDate = new Map<string, typeof processed>();
    for (const entry of processed) {
      const existing = byDate.get(entry.date) || [];
      existing.push(entry);
      byDate.set(entry.date, existing);
    }

    for (const [date, entries] of byDate) {
      if (entries.length < 2) continue;

      try {
        console.error(`${TAG} generating digest for ${date} (${entries.length} sessions)`);

        const digestSessions = entries.map((e) => ({
          title: e.session.title,
          summary: e.extraction.digest || e.extraction.executive_summary.join('. '),
          domain: e.session.domain,
          project: e.session.project,
        }));

        // Call LLM for cross-session synthesis
        let narrative = '';
        let themes: string[] = [];
        let connections: string[] = [];
        let unresolvedItems: string[] = [];

        if (!config.dryRun) {
          const prompt = buildDigestPrompt({ date, sessions: digestSessions });

          try {
            if (config.llmDelayMs > 0) await delay(config.llmDelayMs);
            const raw = await callLLM(prompt, config.llmTimeoutMs);
            const parsed = safeParse<{
              narrative?: string;
              themes?: string[];
              connections?: string[];
              unresolved_items?: string[];
            }>(raw);

            if (parsed) {
              narrative = parsed.narrative || '';
              themes = Array.isArray(parsed.themes) ? parsed.themes : [];
              connections = Array.isArray(parsed.connections) ? parsed.connections : [];
              unresolvedItems = Array.isArray(parsed.unresolved_items) ? parsed.unresolved_items : [];
            }
          } catch (err) {
            console.error(`${TAG} digest LLM failed for ${date}:`, err);
            narrative = `Daily digest for ${date} with ${entries.length} sessions. LLM synthesis unavailable.`;
          }
        }

        const digestPath = writeDigestNote({
          date,
          sessions: digestSessions,
          narrative,
          themes,
          connections,
          unresolvedItems,
          vaultPath: config.vaultPath,
          dryRun: config.dryRun,
        });

        if (digestPath) {
          digestsWritten++;
          watermark.stats.totalNotesCreated++;
        }
      } catch (err) {
        const msg = `Error generating digest for ${date}: ${err}`;
        console.error(`${TAG} ${msg}`);
        errors.push(msg);
      }
    }

    // 10. Write final watermark
    writeWatermark(config.stateDir, watermark);
    console.error(`${TAG} watermark updated`);

    // 11. Log run summary
    const summary: RunSummary = {
      startedAt,
      completedAt: getISOTimestamp(),
      config: {
        vaultPath: config.vaultPath,
        dryRun: config.dryRun,
        backfillDays: config.backfillDays,
        maxSessions: config.maxSessions,
        llmDelayMs: config.llmDelayMs,
        llmTimeoutMs: config.llmTimeoutMs,
        significanceThreshold: config.significanceThreshold,
        knowledgeConfidence: config.knowledgeConfidence,
        autoCommit: config.autoCommit,
      },
      discovered: allDiscovered.length,
      filtered: allDiscovered.length - candidates.length,
      processed: processed.length,
      duplicateSkipped,
      belowThresholdSkipped,
      sessionNotesWritten,
      knowledgeNotesWritten,
      digestsWritten,
      errors,
    };
    writeRunSummary(config.stateDir, summary);

    // 12. Optional git commit
    if (config.autoCommit && !config.dryRun && (sessionNotesWritten > 0 || knowledgeNotesWritten > 0 || digestsWritten > 0)) {
      console.error(`${TAG} auto-committing vault changes...`);
      await gitCommit(config.vaultPath);
    }

    // Final summary
    console.error(`${TAG} ===== Pipeline complete =====`);
    console.error(`${TAG}   Discovered:  ${allDiscovered.length}`);
    console.error(`${TAG}   Filtered:    ${allDiscovered.length - candidates.length}`);
    console.error(`${TAG}   Processed:   ${processed.length}`);
    console.error(`${TAG}   Duplicates:  ${duplicateSkipped}`);
    console.error(`${TAG}   Below threshold: ${belowThresholdSkipped}`);
    console.error(`${TAG}   Session notes: ${sessionNotesWritten}`);
    console.error(`${TAG}   Knowledge notes: ${knowledgeNotesWritten}`);
    console.error(`${TAG}   Digests:     ${digestsWritten}`);
    if (errors.length > 0) {
      console.error(`${TAG}   Errors:      ${errors.length}`);
    }
  } finally {
    // Always release lock
    releaseLock(config.stateDir);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error(`${TAG} fatal error:`, err);
  process.exit(2);
});
