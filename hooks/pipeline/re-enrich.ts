#!/usr/bin/env bun
/**
 * Vault Re-enrichment Command
 *
 * Scans existing vault session notes with heuristic-* summary engines and
 * re-enriches them via LLM analysis. Overwrites notes in-place, preserving
 * file paths and Obsidian links.
 *
 * Usage:
 *   bun hooks/pipeline/re-enrich.ts [options]
 *
 * Options:
 *   --dry-run                Preview without writing
 *   --limit N                Max notes to process per run (default: 10)
 *   --filter-project "Name"  Only re-enrich notes from this project
 *   --filter-since YYYY-MM-DD  Only notes after this date
 *   --force                  Re-enrich even if already enriched
 *
 * Environment variables:
 *   OBSIDIAN_VAULT           Vault path (default: ~/personal/cortana-obsidian)
 *   PIPELINE_LLM_DELAY_MS    Delay between LLM calls (default: 1000)
 *   PIPELINE_LLM_TIMEOUT_MS  LLM call timeout (default: 30000)
 *   PIPELINE_LLM_MODEL       Claude model for analysis (default: claude-haiku-4-5-20251001)
 *   PIPELINE_KNOWLEDGE_CONFIDENCE  Min confidence for knowledge notes (default: 0.75)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';

import { extractSessionKnowledge } from './analysis/extract';
import { renderSessionNote } from '../core/render';
import { detectSessionType, getISOTimestamp } from '../core/common';
import { acquireLock, releaseLock } from './state/lock';
import { buildVaultIndex } from './dedup/vault-index';
import { writeKnowledgeNotes } from './output/knowledge-writer';
import type { DiscoveredSession, SourceType } from './discovery/types';
import type { SessionNotePayload, Domain } from '../core/types';

const TAG = '[re-enrich]';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ReEnrichConfig {
  vaultPath: string;
  stateDir: string;
  dryRun: boolean;
  limit: number;
  filterProject: string;
  filterSince: string;
  force: boolean;
  llmDelayMs: number;
  llmTimeoutMs: number;
  llmModel: string;
  knowledgeConfidence: number;
}

function parseArgs(): ReEnrichConfig {
  const args = process.argv.slice(2);
  const vaultPath =
    process.env.OBSIDIAN_VAULT || join(homedir(), 'personal', 'cortana-obsidian');

  const config: ReEnrichConfig = {
    vaultPath,
    stateDir: join(vaultPath, '.pipeline-state'),
    dryRun: false,
    limit: 10,
    filterProject: '',
    filterSince: '',
    force: false,
    llmDelayMs: Number(process.env.PIPELINE_LLM_DELAY_MS) || 1000,
    llmTimeoutMs: Number(process.env.PIPELINE_LLM_TIMEOUT_MS) || 30_000,
    llmModel: process.env.PIPELINE_LLM_MODEL || 'claude-haiku-4-5-20251001',
    knowledgeConfidence: Number(process.env.PIPELINE_KNOWLEDGE_CONFIDENCE) || 0.75,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--limit':
        config.limit = Number(args[++i]) || 10;
        break;
      case '--filter-project':
        config.filterProject = args[++i] || '';
        break;
      case '--filter-since':
        config.filterSince = args[++i] || '';
        break;
      case '--force':
        config.force = true;
        break;
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// Vault scanning
// ---------------------------------------------------------------------------

interface VaultCandidate {
  filePath: string;
  sessionId: string;
  date: string;
  time: string;
  domain: Domain;
  project: string;
  model: string;
  summary: string;
  summaryEngine: string;
}

function collectMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        results.push(...collectMarkdownFiles(full));
      } else if (entry.endsWith('.md')) {
        results.push(full);
      }
    } catch {
      // Skip unreadable entries
    }
  }
  return results;
}

function parseFrontmatter(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').slice(0, 25);
    let inFrontmatter = false;
    for (const line of lines) {
      if (line.trim() === '---') {
        if (inFrontmatter) break;
        inFrontmatter = true;
        continue;
      }
      if (!inFrontmatter) continue;
      const match = line.match(/^([a-z_]+):\s*"?([^"]*)"?\s*$/);
      if (match) result[match[1]] = match[2].trim();
    }
  } catch {
    // Skip unreadable files
  }
  return result;
}

function scanForCandidates(config: ReEnrichConfig): VaultCandidate[] {
  const sessionsDir = join(config.vaultPath, 'Sessions');
  const allFiles = collectMarkdownFiles(sessionsDir);
  const candidates: VaultCandidate[] = [];

  for (const filePath of allFiles) {
    const fm = parseFrontmatter(filePath);

    // Must have a session_id
    if (!fm.session_id) continue;

    // Must have a heuristic engine (unless --force, then include already-enriched)
    const engine = fm.summary_engine || '';
    if (!config.force && !engine.startsWith('heuristic')) continue;

    // If --force, skip notes that already have enriched_at (already re-enriched)
    if (config.force && fm.enriched_at) continue;

    // Apply filters
    if (config.filterProject) {
      const noteProject = (fm.project || '').toLowerCase();
      if (!noteProject.includes(config.filterProject.toLowerCase())) continue;
    }

    if (config.filterSince) {
      const noteDate = fm.date || '';
      if (noteDate < config.filterSince) continue;
    }

    candidates.push({
      filePath,
      sessionId: fm.session_id,
      date: fm.date || '',
      time: fm.time || '00:00',
      domain: (fm.domain || 'personal') as Domain,
      project: fm.project || '',
      model: fm.model || '',
      summary: fm.summary || '',
      summaryEngine: engine,
    });
  }

  // Sort by date ascending (oldest first)
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  return candidates.slice(0, config.limit);
}

// ---------------------------------------------------------------------------
// Transcript lookup
// ---------------------------------------------------------------------------

interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

function buildHistoryIndex(): Map<string, { project: string; timestamp: number }> {
  const historyPath = join(homedir(), '.claude', 'history.jsonl');
  const index = new Map<string, { project: string; timestamp: number }>();

  if (!existsSync(historyPath)) {
    console.error(`${TAG} history.jsonl not found`);
    return index;
  }

  try {
    const content = readFileSync(historyPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as HistoryEntry;
        if (entry.sessionId && entry.timestamp) {
          const existing = index.get(entry.sessionId);
          if (!existing || entry.timestamp > existing.timestamp) {
            index.set(entry.sessionId, {
              project: entry.project,
              timestamp: entry.timestamp,
            });
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch (err) {
    console.error(`${TAG} failed to read history:`, err);
  }

  console.error(`${TAG} history index: ${index.size} sessions`);
  return index;
}

function encodeProjectPath(rawPath: string): string {
  return rawPath.replace(/\//g, '-');
}

function findTranscriptPath(
  sessionId: string,
  historyIndex: Map<string, { project: string; timestamp: number }>,
): { transcriptPath: string; source: SourceType; cwd: string } | null {
  const projectsBase = join(homedir(), '.claude', 'projects');

  // Try Claude Code first
  const historyEntry = historyIndex.get(sessionId);
  if (historyEntry) {
    const encoded = encodeProjectPath(historyEntry.project);
    const transcriptPath = join(projectsBase, encoded, `${sessionId}.jsonl`);
    if (existsSync(transcriptPath)) {
      return {
        transcriptPath,
        source: 'claude-code',
        cwd: historyEntry.project,
      };
    }
  }

  // Try Claude Desktop
  const desktopBase = join(
    homedir(),
    'Library',
    'Application Support',
    'Claude',
    'local-agent-mode-sessions',
  );

  if (existsSync(desktopBase)) {
    // Walk desktop sessions looking for matching session ID
    const metaFiles = findDesktopMetaFiles(desktopBase);
    for (const metaFile of metaFiles) {
      const metaSessionId = basename(metaFile, '.json').replace(/^local_/, '');
      if (metaSessionId === sessionId) {
        // Look for audit.jsonl
        const parentDir = dirname(metaFile);
        const auditPath = join(parentDir, sessionId, 'audit.jsonl');
        if (existsSync(auditPath)) {
          return {
            transcriptPath: auditPath,
            source: 'claude-desktop',
            cwd: '',
          };
        }
      }
    }
  }

  return null;
}

function findDesktopMetaFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          results.push(...findDesktopMetaFiles(full));
        } else if (entry.startsWith('local_') && entry.endsWith('.json')) {
          results.push(full);
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ORIGINAL_FOOTER = '*Auto-captured by ObsidianSessionCapture at session end*';
const PIPELINE_FOOTER = '*Auto-captured by DailyExtractionPipeline*';

async function main(): Promise<void> {
  const config = parseArgs();
  console.error(`${TAG} ===== Re-enrichment starting =====`);
  console.error(`${TAG} vault: ${config.vaultPath}`);
  console.error(`${TAG} dry-run: ${config.dryRun}`);
  console.error(`${TAG} limit: ${config.limit}`);
  console.error(`${TAG} force: ${config.force}`);
  if (config.filterProject) console.error(`${TAG} filter-project: ${config.filterProject}`);
  if (config.filterSince) console.error(`${TAG} filter-since: ${config.filterSince}`);

  // 1. Acquire lock
  if (!acquireLock(config.stateDir)) {
    console.error(`${TAG} another instance is running, exiting`);
    process.exit(1);
  }

  let enrichedCount = 0;
  let stillHeuristicCount = 0;
  let transcriptNotFoundCount = 0;
  let knowledgeNotesWritten = 0;

  try {
    // 2. Scan vault for candidates
    const candidates = scanForCandidates(config);
    console.error(`${TAG} candidates found: ${candidates.length}`);

    if (candidates.length === 0) {
      console.error(`${TAG} no candidates to process`);
      return;
    }

    // 3. Build history index for transcript lookup
    const historyIndex = buildHistoryIndex();

    // 4. Build vault index for knowledge note dedup
    const vaultIndex = buildVaultIndex(config.vaultPath);

    // 5. Process each candidate
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const progress = `[${i + 1}/${candidates.length}]`;

      console.error(
        `${TAG} ${progress} processing: ${candidate.sessionId} (${candidate.summaryEngine})`,
      );

      // 5a. Find transcript
      const transcript = findTranscriptPath(candidate.sessionId, historyIndex);
      if (!transcript) {
        console.error(`${TAG} ${progress} transcript not found, skipping`);
        transcriptNotFoundCount++;
        continue;
      }

      // 5b. Build DiscoveredSession
      const createdAtMs = Date.parse(
        `${candidate.date}T${candidate.time}:00`,
      );
      const session: DiscoveredSession = {
        id: candidate.sessionId,
        source: transcript.source,
        title: candidate.summary || candidate.sessionId,
        model: candidate.model,
        createdAt: Number.isNaN(createdAtMs) ? Date.now() : createdAtMs,
        lastActivityAt: Number.isNaN(createdAtMs) ? Date.now() : createdAtMs,
        cwd: transcript.cwd,
        userPaths: transcript.cwd ? [transcript.cwd] : [],
        domain: candidate.domain,
        project: candidate.project,
        transcriptPath: transcript.transcriptPath,
        subagentPaths: [],
      };

      // 5c. Extract knowledge via LLM
      const extraction = await extractSessionKnowledge(session, {
        dryRun: config.dryRun,
        llmModel: config.llmModel,
        llmTimeout: config.llmTimeoutMs,
        delayMs: config.llmDelayMs,
      });

      // 5d. If still heuristic, skip rewrite
      if (extraction.engine.startsWith('heuristic')) {
        console.error(
          `${TAG} ${progress} still heuristic (${extraction.engine}), skipping rewrite`,
        );
        stillHeuristicCount++;
        continue;
      }

      // 5e. Build payload and rewrite note
      const completedAt = new Date(session.lastActivityAt).toISOString();
      const createdAt = new Date(session.createdAt).toISOString();

      const payload: SessionNotePayload = {
        title: session.title,
        sessionId: session.id,
        domain: session.domain,
        project: session.project,
        model: session.model,
        sessionType: detectSessionType(session.title),
        createdAt,
        completedAt,
        summary: extraction.digest || extraction.executive_summary.join('\n'),
        assistantName: 'Cortana',
        isc: { criteria: [], satisfaction: null },
        enrichment: {
          executiveSummary: extraction.executive_summary,
          keyDecisions: extraction.key_decisions,
          digest: extraction.digest,
          recommendations: [],
          git: {
            available: false,
            repoRoot: '',
            branch: '',
            headSha: '',
            workingTreeFiles: 0,
            stagedFiles: 0,
            changedFiles: [],
            insertions: 0,
            deletions: 0,
          },
          summaryEngine: extraction.engine,
          summaryModel: extraction.model,
          distillCount:
            extraction.patterns.length +
            extraction.learnings.length +
            extraction.key_decisions.length,
          enrichmentMode: 'inline',
          enrichedAt: new Date().toISOString(),
        },
      };

      let content = renderSessionNote(payload);

      // Replace footer
      content = content.replace(ORIGINAL_FOOTER, PIPELINE_FOOTER);

      // Insert source: "daily-pipeline" after status line
      content = content.replace(
        /^(status: completed)/m,
        '$1\nsource: "daily-pipeline"',
      );

      if (config.dryRun) {
        console.error(`${TAG} ${progress} (dry-run) would rewrite: ${candidate.filePath}`);
      } else {
        writeFileSync(candidate.filePath, content, 'utf-8');
        console.error(`${TAG} ${progress} re-enriched: ${candidate.filePath}`);
      }

      enrichedCount++;

      // 5f. Write knowledge notes
      const sessionFilename = basename(candidate.filePath);
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
    }

    // 6. Report summary
    console.error(`${TAG} ===== Complete =====`);
    console.error(`${TAG}   Candidates:       ${candidates.length}`);
    console.error(`${TAG}   Transcript found:  ${candidates.length - transcriptNotFoundCount}`);
    console.error(`${TAG}   Enriched:          ${enrichedCount}`);
    console.error(`${TAG}   Still heuristic:   ${stillHeuristicCount}`);
    console.error(`${TAG}   No transcript:     ${transcriptNotFoundCount}`);
    console.error(`${TAG}   Knowledge notes:   ${knowledgeNotesWritten}`);
  } finally {
    releaseLock(config.stateDir);
  }
}

main().catch((err) => {
  console.error(`${TAG} fatal error:`, err);
  process.exit(2);
});
