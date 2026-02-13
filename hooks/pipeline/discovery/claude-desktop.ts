import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { detectDomain, detectProject } from '../../core/common';
import type { DiscoveredSession } from './types';

const TAG = '[discovery:claude-desktop]';

const BASE_DIR = join(
  homedir(),
  'Library',
  'Application Support',
  'Claude',
  'local-agent-mode-sessions',
);

interface DesktopMetadata {
  title: string;
  model: string;
  createdAt: string | number;
  lastActivityAt: string | number;
  cwd: string;
  userSelectedFolders: string[];
  isArchived: boolean;
}

function toMs(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function findMetadataFiles(baseDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (entry.startsWith('local_') && entry.endsWith('.json')) {
          results.push(full);
        }
      } catch {
        // skip inaccessible entries
      }
    }
  }

  walk(baseDir);
  return results;
}

function parseMetadata(filePath: string): DesktopMetadata | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      title: data.title || '',
      model: data.model || '',
      createdAt: data.createdAt || '',
      lastActivityAt: data.lastActivityAt || '',
      cwd: data.cwd || '',
      userSelectedFolders: Array.isArray(data.userSelectedFolders)
        ? data.userSelectedFolders
        : [],
      isArchived: !!data.isArchived,
    };
  } catch (err) {
    console.error(`${TAG} failed to parse metadata ${filePath}:`, err);
    return null;
  }
}

function extractSessionId(filename: string): string {
  // local_{session-id}.json → session-id
  return basename(filename, '.json').replace(/^local_/, '');
}

function findAuditPath(metadataPath: string, sessionId: string): string {
  // audit.jsonl lives at {session-id}/audit.jsonl relative to metadata parent dir
  const parentDir = dirname(metadataPath);
  const candidate = join(parentDir, sessionId, 'audit.jsonl');
  if (existsSync(candidate)) return candidate;

  // Also try sibling directory structure
  const siblingCandidate = join(dirname(parentDir), sessionId, 'audit.jsonl');
  if (existsSync(siblingCandidate)) return siblingCandidate;

  return '';
}

export function discoverDesktopSessions(since: number): DiscoveredSession[] {
  if (!existsSync(BASE_DIR)) {
    console.error(`${TAG} base directory not found: ${BASE_DIR}`);
    return [];
  }

  const metaFiles = findMetadataFiles(BASE_DIR);
  const sessions: DiscoveredSession[] = [];

  for (const metaFile of metaFiles) {
    const meta = parseMetadata(metaFile);
    if (!meta) continue;

    // Filter: skip archived sessions
    if (meta.isArchived) continue;

    // Parse timestamps (can be ms epoch number or ISO string)
    const createdAtMs = toMs(meta.createdAt);
    const lastActivityMs = meta.lastActivityAt ? toMs(meta.lastActivityAt) : createdAtMs;

    if (!createdAtMs || Number.isNaN(createdAtMs)) {
      console.error(`${TAG} invalid createdAt for ${metaFile}`);
      continue;
    }

    // Filter by time
    if (createdAtMs < since) continue;

    const sessionId = extractSessionId(basename(metaFile));
    const transcriptPath = findAuditPath(metaFile, sessionId);

    // For domain detection: prefer userSelectedFolders[0] (real user path), fall back to cwd
    const domainPath = meta.userSelectedFolders[0] || meta.cwd || '';
    const userPaths = meta.userSelectedFolders.length > 0
      ? meta.userSelectedFolders
      : meta.cwd ? [meta.cwd] : [];

    sessions.push({
      id: sessionId,
      source: 'claude-desktop',
      title: meta.title,
      model: meta.model,
      createdAt: createdAtMs,
      lastActivityAt: Number.isNaN(lastActivityMs) ? createdAtMs : lastActivityMs,
      cwd: meta.cwd,
      userPaths,
      domain: domainPath ? detectDomain(domainPath) : 'personal',
      project: domainPath ? detectProject(domainPath) : '',
      transcriptPath,
      subagentPaths: [], // Desktop sessions don't have subagent transcripts in the same structure
    });
  }

  console.error(`${TAG} discovered ${sessions.length} sessions since ${new Date(since).toISOString()}`);
  return sessions;
}
