import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { detectDomain, detectProject } from '../../core/common';
import type { DiscoveredSession } from './types';

const TAG = '[discovery:claude-code]';

interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

interface TranscriptMeta {
  model: string;
  cwd: string;
  lastTimestamp: number;
}

function encodeProjectPath(rawPath: string): string {
  return rawPath.replace(/\//g, '-');
}

function readHistory(historyPath: string): HistoryEntry[] {
  if (!existsSync(historyPath)) {
    console.error(`${TAG} history.jsonl not found at ${historyPath}`);
    return [];
  }

  const lines: HistoryEntry[] = [];
  try {
    const content = readFileSync(historyPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as HistoryEntry;
        if (entry.sessionId && entry.timestamp) {
          lines.push(entry);
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch (err) {
    console.error(`${TAG} failed to read history:`, err);
  }
  return lines;
}

function extractTranscriptMeta(transcriptPath: string, maxLines = 30): TranscriptMeta {
  const meta: TranscriptMeta = { model: '', cwd: '', lastTimestamp: 0 };
  if (!existsSync(transcriptPath)) return meta;

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');
    const limit = Math.min(lines.length, maxLines);

    for (let i = 0; i < limit; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);

        if (!meta.cwd && entry.cwd) {
          meta.cwd = entry.cwd;
        }

        if (!meta.model && entry.message?.model) {
          meta.model = entry.message.model;
        }

        if (entry.timestamp) {
          const ts = typeof entry.timestamp === 'string'
            ? Date.parse(entry.timestamp)
            : entry.timestamp;
          if (ts > meta.lastTimestamp) meta.lastTimestamp = ts;
        }
      } catch {
        // skip malformed lines
      }
    }

    // Scan last few lines for lastActivityAt
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.timestamp) {
          const ts = typeof entry.timestamp === 'string'
            ? Date.parse(entry.timestamp)
            : entry.timestamp;
          if (ts > meta.lastTimestamp) meta.lastTimestamp = ts;
        }
        break; // only need the last valid entry
      } catch {
        // skip
      }
    }
  } catch (err) {
    console.error(`${TAG} failed to read transcript ${transcriptPath}:`, err);
  }

  return meta;
}

function findSubagentPaths(transcriptDir: string, sessionId: string): string[] {
  const subagentDir = join(transcriptDir, sessionId, 'subagents');
  if (!existsSync(subagentDir)) return [];

  try {
    return readdirSync(subagentDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => join(subagentDir, f));
  } catch {
    return [];
  }
}

export function discoverCodeSessions(since: number): DiscoveredSession[] {
  const home = homedir();
  const historyPath = join(home, '.claude', 'history.jsonl');
  const projectsBase = join(home, '.claude', 'projects');

  const entries = readHistory(historyPath);

  // Filter by timestamp and deduplicate by sessionId (keep latest entry per session)
  const sessionMap = new Map<string, HistoryEntry>();
  for (const entry of entries) {
    if (entry.timestamp < since) continue;
    const existing = sessionMap.get(entry.sessionId);
    if (!existing || entry.timestamp > existing.timestamp) {
      sessionMap.set(entry.sessionId, entry);
    }
  }

  const sessions: DiscoveredSession[] = [];

  for (const [sessionId, entry] of sessionMap) {
    const encodedProject = encodeProjectPath(entry.project);
    const transcriptDir = join(projectsBase, encodedProject);
    const transcriptPath = join(transcriptDir, `${sessionId}.jsonl`);

    if (!existsSync(transcriptPath)) {
      console.error(`${TAG} transcript not found for session ${sessionId}: ${transcriptPath}`);
      continue;
    }

    const meta = extractTranscriptMeta(transcriptPath);
    const cwd = meta.cwd || entry.project;
    const subagentPaths = findSubagentPaths(transcriptDir, sessionId);

    sessions.push({
      id: sessionId,
      source: 'claude-code',
      title: entry.display.trim(),
      model: meta.model,
      createdAt: entry.timestamp,
      lastActivityAt: meta.lastTimestamp || entry.timestamp,
      cwd,
      userPaths: [cwd],
      domain: detectDomain(cwd),
      project: detectProject(cwd),
      transcriptPath,
      subagentPaths,
    });
  }

  console.error(`${TAG} discovered ${sessions.length} sessions since ${new Date(since).toISOString()}`);
  return sessions;
}
