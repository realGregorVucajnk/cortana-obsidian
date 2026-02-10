#!/usr/bin/env bun
/**
 * session-capture.hook.ts — Capture Claude Code sessions to Obsidian (SessionEnd)
 *
 * Standalone hook with no external dependencies. Copy to ~/.claude/hooks/ and
 * register in settings.json under SessionEnd.
 *
 * Configuration:
 *   OBSIDIAN_VAULT env var — path to your vault (default: ~/obsidian-vault)
 *
 * Expects a work-tracking state file at ~/.claude/MEMORY/STATE/current-work.json
 * with fields: session_id, session_dir, task_count, current_task, created_at
 *
 * Creates: Sessions/YYYY/MM/YYYY-MM-DD_HHMM_{slug}.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// ============================================================================
// Configuration
// ============================================================================

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const MEMORY_DIR = join(homedir(), '.claude', 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');
const WORK_DIR = join(MEMORY_DIR, 'WORK');
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Claude';

// ============================================================================
// Types
// ============================================================================

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_count: number;
  created_at: string;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

interface ISCData {
  criteria: string[];
  satisfaction: { satisfied: number; total: number } | null;
}

// ============================================================================
// Helpers (inlined — no external dependencies)
// ============================================================================

function getISOTimestamp(): string {
  return new Date().toISOString();
}

function getDateComponents(): { year: number; month: string; day: string; hours: string; minutes: string } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0'),
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0'),
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function detectDomain(transcriptPath: string): string {
  const home = homedir();
  if (transcriptPath.includes(join(home, 'work'))) return 'work';
  if (transcriptPath.includes(join(home, 'personal'))) return 'personal';
  if (transcriptPath.includes(join(home, 'opensource'))) return 'opensource';
  return 'personal';
}

function detectSessionType(content: string): string {
  const lower = content.toLowerCase();
  if (/implement|build|create|add feature|write code/.test(lower)) return 'implementation';
  if (/debug|fix|bug|error|troubleshoot/.test(lower)) return 'debugging';
  if (/research|investigate|explore|find out/.test(lower)) return 'research';
  if (/plan|design|architect|strategy/.test(lower)) return 'planning';
  if (/review|audit|check|validate/.test(lower)) return 'review';
  if (/explore|browse|understand|learn/.test(lower)) return 'exploration';
  return 'implementation';
}

function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([a-z_]+):\s*"?([^"]*)"?\s*$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

// ============================================================================
// ISC Collection
// ============================================================================

function collectISC(workPath: string): ISCData {
  const tasksDir = join(workPath, 'tasks');
  const allCriteria: string[] = [];
  let totalSatisfied = 0;
  let totalCriteria = 0;

  if (!existsSync(tasksDir)) return { criteria: [], satisfaction: null };

  try {
    const taskDirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const taskDir of taskDirs) {
      const iscPath = join(tasksDir, taskDir, 'ISC.json');
      if (!existsSync(iscPath)) continue;

      try {
        const isc = JSON.parse(readFileSync(iscPath, 'utf-8'));
        if (isc.criteria?.length) {
          allCriteria.push(...isc.criteria);
        }
        if (isc.satisfaction) {
          totalSatisfied += isc.satisfaction.satisfied || 0;
          totalCriteria += isc.satisfaction.total || 0;
        }
      } catch {
        // Skip malformed ISC files
      }
    }
  } catch {
    // Skip if tasks dir is unreadable
  }

  return {
    criteria: allCriteria,
    satisfaction: totalCriteria > 0 ? { satisfied: totalSatisfied, total: totalCriteria } : null,
  };
}

// ============================================================================
// Thread Content
// ============================================================================

function collectThreadContent(workPath: string): string {
  const tasksDir = join(workPath, 'tasks');
  if (!existsSync(tasksDir)) return '';

  const parts: string[] = [];
  try {
    const taskDirs = readdirSync(tasksDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const taskDir of taskDirs) {
      const threadPath = join(tasksDir, taskDir, 'THREAD.md');
      if (!existsSync(threadPath)) continue;
      try {
        parts.push(readFileSync(threadPath, 'utf-8'));
      } catch {
        // Skip unreadable threads
      }
    }
  } catch {
    // Skip
  }

  return parts.join('\n\n---\n\n');
}

// ============================================================================
// Note Generation
// ============================================================================

function generateNote(params: {
  title: string;
  sessionId: string;
  domain: string;
  sessionType: string;
  createdAt: string;
  completedAt: string;
  summary: string;
  isc: ISCData;
}): string {
  const { title, sessionId, domain, sessionType, createdAt, completedAt, summary, isc } = params;

  const date = completedAt.split('T')[0] || createdAt.split('T')[0];
  const time = completedAt.split('T')[1]?.slice(0, 5) || '00:00';

  const tags = ['cortana-session', sessionType];
  const oneLine = summary.split('\n')[0].replace(/"/g, '\\"').slice(0, 200);

  let content = `---
date: ${date}
time: "${time}"
type: session
session_type: ${sessionType}
domain: ${domain}
status: completed
tags:
${tags.map(t => `  - ${t}`).join('\n')}
summary: "${oneLine}"
session_id: "${sessionId}"${isc.satisfaction ? `\nisc_satisfied: ${isc.satisfaction.satisfied}\nisc_total: ${isc.satisfaction.total}` : ''}
---

# ${title}

## Summary

${summary}

## Session Details

| Field | Value |
|-------|-------|
| Session ID | \`${sessionId}\` |
| Domain | ${domain} |
| Type | ${sessionType} |
| Started | ${createdAt} |
| Completed | ${completedAt || 'N/A'} |
| Assistant | ${ASSISTANT_NAME} |
`;

  if (isc.criteria.length > 0) {
    content += `\n## Ideal State Criteria\n\n`;
    for (const criterion of isc.criteria) {
      const check = isc.satisfaction ? '- [x]' : '- [ ]';
      content += `${check} ${criterion}\n`;
    }
    if (isc.satisfaction) {
      content += `\n**Result:** ${isc.satisfaction.satisfied}/${isc.satisfaction.total} satisfied\n`;
    }
  }

  content += `\n---\n*Auto-captured at session end*\n`;
  return content;
}

// ============================================================================
// Main
// ============================================================================

async function readStdin(): Promise<HookInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      return JSON.parse(input) as HookInput;
    }
  } catch (error) {
    console.error('[SessionCapture] Error reading stdin:', error);
  }
  return null;
}

async function main() {
  try {
    const hookInput = await readStdin();
    if (!hookInput) {
      process.exit(0);
    }

    // Check vault exists
    if (!existsSync(VAULT_PATH)) {
      console.error('[SessionCapture] Vault not found at', VAULT_PATH);
      process.exit(0);
    }

    // Read current work state
    if (!existsSync(CURRENT_WORK_FILE)) {
      console.error('[SessionCapture] No current-work.json, skipping');
      process.exit(0);
    }

    let currentWork: CurrentWork;
    try {
      currentWork = JSON.parse(readFileSync(CURRENT_WORK_FILE, 'utf-8'));
    } catch {
      console.error('[SessionCapture] Failed to parse current-work.json');
      process.exit(0);
    }

    if (!currentWork.session_dir) {
      console.error('[SessionCapture] No session_dir in current work');
      process.exit(0);
    }

    // Read META.yaml
    const workPath = join(WORK_DIR, currentWork.session_dir);
    const metaPath = join(workPath, 'META.yaml');

    if (!existsSync(metaPath)) {
      console.error('[SessionCapture] No META.yaml found');
      process.exit(0);
    }

    const metaContent = readFileSync(metaPath, 'utf-8');
    const meta = parseSimpleYaml(metaContent);
    const title = meta.title || 'Untitled Session';
    const createdAt = meta.created_at || currentWork.created_at || getISOTimestamp();

    // Collect ISC criteria
    const isc = collectISC(workPath);

    // Significance filter: skip trivial sessions
    if ((currentWork.task_count || 0) < 2 && isc.criteria.length === 0) {
      console.error('[SessionCapture] Trivial session, skipping');
      process.exit(0);
    }

    // Collect thread content for type detection
    const threadContent = collectThreadContent(workPath);

    // Use title as summary (add your own AI inference here for richer summaries)
    const summary = title;

    // Detect domain and session type
    const domain = detectDomain(hookInput.transcript_path || process.cwd());
    const sessionType = detectSessionType(threadContent || title);

    // Build output path
    const { year, month, day, hours, minutes } = getDateComponents();
    const sessionDir = join(VAULT_PATH, 'Sessions', String(year), month);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    const slug = slugify(title);
    const filename = `${year}-${month}-${day}_${hours}${minutes}_${slug}.md`;
    const filepath = join(sessionDir, filename);

    // Generate and write the note
    const note = generateNote({
      title,
      sessionId: currentWork.session_id || hookInput.session_id,
      domain,
      sessionType,
      createdAt,
      completedAt: getISOTimestamp(),
      summary,
      isc,
    });

    writeFileSync(filepath, note, 'utf-8');
    console.error(`[SessionCapture] Created: ${filename}`);

    // Git add + commit (fire-and-forget)
    try {
      Bun.spawn(['git', '-C', VAULT_PATH, 'add', 'Sessions/'], {
        stdout: 'ignore',
        stderr: 'ignore',
      });

      setTimeout(() => {
        Bun.spawn(['git', '-C', VAULT_PATH, 'commit', '-m', `session: ${title}`, '--no-gpg-sign'], {
          stdout: 'ignore',
          stderr: 'ignore',
        });
      }, 500);
    } catch {
      // Git failures are non-critical
    }

    process.exit(0);
  } catch (error) {
    console.error(`[SessionCapture] Error: ${error}`);
    process.exit(0);
  }
}

main();
