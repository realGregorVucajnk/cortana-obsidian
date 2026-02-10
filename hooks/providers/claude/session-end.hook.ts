#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { collectISC, collectThreadContent } from '../../core/session';
import { detectDomain, detectProject, detectSessionType, getDateComponents, getISOTimestamp, isTrivialTitle, parseDateOrFallback, parseSimpleYaml, slugify, toNumber } from '../../core/common';
import { detectModelFromTranscript, ensureDir, readHookStdin, writeTextFile } from '../../core/io';
import { renderSessionNote } from '../../core/render';
import type { CurrentWork, WorkResolution } from '../../core/types';

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const MEMORY_DIR = join(homedir(), '.claude', 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');
const WORK_DIR = join(MEMORY_DIR, 'WORK');
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Claude';
const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || '';
const SESSION_CAPTURE_AUTO_COMMIT = (process.env.SESSION_CAPTURE_AUTO_COMMIT || 'false').toLowerCase() === 'true';

function resolveFromCurrentWork(): WorkResolution | null {
  if (!existsSync(CURRENT_WORK_FILE)) return null;

  try {
    const currentWork = JSON.parse(readFileSync(CURRENT_WORK_FILE, 'utf-8')) as CurrentWork;
    if (!currentWork.session_dir) return null;

    const workPath = join(WORK_DIR, currentWork.session_dir);
    const metaPath = join(workPath, 'META.yaml');
    if (!existsSync(metaPath)) return null;

    const meta = parseSimpleYaml(readFileSync(metaPath, 'utf-8'));
    return { currentWork, workPath, meta };
  } catch {
    return null;
  }
}

function resolveFromRecentWork(): WorkResolution | null {
  if (!existsSync(WORK_DIR)) return null;

  try {
    const candidates: Array<{ ts: number; currentWork: CurrentWork; workPath: string; meta: Record<string, string> }> = [];
    const workDirs = readdirSync(WORK_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const dirent of workDirs) {
      const sessionDir = dirent.name;
      const workPath = join(WORK_DIR, sessionDir);
      const metaPath = join(workPath, 'META.yaml');
      if (!existsSync(metaPath)) continue;

      let meta: Record<string, string>;
      try {
        meta = parseSimpleYaml(readFileSync(metaPath, 'utf-8'));
      } catch {
        continue;
      }

      const status = (meta.status || '').toUpperCase();
      if (status !== 'ACTIVE' && status !== 'COMPLETED') continue;

      const metaStat = statSync(metaPath);
      const ts = parseDateOrFallback(meta.updated_at || meta.completed_at || meta.created_at, metaStat.mtimeMs);

      const currentWork: CurrentWork = {
        session_id: meta.session_id || sessionDir,
        session_dir: sessionDir,
        current_task: meta.current_task || '',
        task_count: toNumber(meta.task_count),
        created_at: meta.created_at || getISOTimestamp(),
      };

      candidates.push({ ts, currentWork, workPath, meta });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.ts - a.ts);
    const best = candidates[0];

    return {
      currentWork: best.currentWork,
      workPath: best.workPath,
      meta: best.meta,
    };
  } catch {
    return null;
  }
}

function resolveWorkState(): WorkResolution | null {
  return resolveFromCurrentWork() || resolveFromRecentWork();
}

function detectModel(transcriptPath: string): string {
  return ASSISTANT_MODEL || detectModelFromTranscript(transcriptPath);
}

export async function runClaudeSessionEndHook(): Promise<number> {
  const hookInput = await readHookStdin('ClaudeSessionCapture');
  if (!hookInput) return 0;

  if (!existsSync(VAULT_PATH)) {
    console.error('[ClaudeSessionCapture] Vault not found at', VAULT_PATH);
    return 0;
  }

  const resolved = resolveWorkState();
  if (!resolved) {
    console.error('[ClaudeSessionCapture] No active session state found, skipping');
    return 0;
  }

  const { currentWork, workPath, meta } = resolved;
  const title = meta.title || 'Untitled Session';
  const createdAt = meta.created_at || currentWork.created_at || getISOTimestamp();
  const taskCount = toNumber(currentWork.task_count || meta.task_count);

  if (taskCount < 2 && isTrivialTitle(title)) {
    console.error('[ClaudeSessionCapture] Trivial session, skipping');
    return 0;
  }

  const transcriptPath = hookInput.transcript_path || process.cwd();
  const threadContent = collectThreadContent(workPath);
  const model = detectModel(transcriptPath);

  const note = renderSessionNote({
    title,
    sessionId: currentWork.session_id || hookInput.session_id || 'unknown',
    domain: detectDomain(transcriptPath),
    project: detectProject(transcriptPath),
    model,
    sessionType: detectSessionType(threadContent || title),
    createdAt,
    completedAt: getISOTimestamp(),
    summary: title,
    assistantName: ASSISTANT_NAME,
    isc: collectISC(workPath),
  });

  const { year, month, day, hours, minutes } = getDateComponents();
  const sessionDir = join(VAULT_PATH, 'Sessions', String(year), month);
  ensureDir(sessionDir);

  const filename = `${year}-${month}-${day}_${hours}${minutes}_${slugify(title, 40)}.md`;
  const filepath = join(sessionDir, filename);
  writeTextFile(filepath, note);
  console.error(`[ClaudeSessionCapture] Created: ${filename}`);

  if (SESSION_CAPTURE_AUTO_COMMIT) {
    try {
      Bun.spawn(['git', '-C', VAULT_PATH, 'add', 'Sessions/'], { stdout: 'ignore', stderr: 'ignore' });
      setTimeout(() => {
        Bun.spawn(['git', '-C', VAULT_PATH, 'commit', '-m', `session: ${title}`, '--no-gpg-sign'], {
          stdout: 'ignore',
          stderr: 'ignore',
        });
      }, 500);
    } catch {
      // Non-blocking.
    }
  }

  return 0;
}

if (import.meta.main) {
  const code = await runClaudeSessionEndHook();
  process.exit(code);
}
