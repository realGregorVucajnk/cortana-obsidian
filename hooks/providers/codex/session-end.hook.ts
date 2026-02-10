#!/usr/bin/env bun

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { detectDomain, detectProject, detectSessionType, getDateComponents, getISOTimestamp, isTrivialTitle, slugify } from '../../core/common';
import { detectModelFromTranscript, ensureDir, readHookStdin, writeTextFile } from '../../core/io';
import { renderSessionNote } from '../../core/render';
import { runSessionIntelligence } from '../../core/session-intelligence';
import { enqueueSessionEnrichment } from '../../core/queue/enqueue';

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Codex';
const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL || '';

function extractTranscriptSignals(transcriptPath: string): { title: string; content: string } {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return { title: 'Codex Session', content: '' };
  }

  try {
    const lines = readFileSync(transcriptPath, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
    let lastUser = '';
    let combined = '';

    for (const line of lines.slice(-300)) {
      try {
        const entry = JSON.parse(line);
        const role = entry?.role || '';
        let text = '';

        if (typeof entry?.content === 'string') text = entry.content;
        else if (Array.isArray(entry?.content)) {
          text = entry.content
            .filter((c: any) => c?.type === 'text')
            .map((c: any) => c?.text || '')
            .join('\n');
        }

        if (text) {
          combined += `\n${text}`;
          if (role === 'user') lastUser = text;
        }
      } catch {
        // Ignore malformed line.
      }
    }

    const firstMeaningful = (lastUser || combined || 'Codex Session').split('\n').find((l) => l.trim().length > 0) || 'Codex Session';
    return { title: firstMeaningful.slice(0, 120), content: combined };
  } catch {
    return { title: 'Codex Session', content: '' };
  }
}

export async function runCodexSessionEndHook(): Promise<number> {
  const hookInput = await readHookStdin('CodexSessionCapture');
  if (!hookInput) return 0;
  if (!existsSync(VAULT_PATH)) return 0;

  const transcriptPath = hookInput.transcript_path || '';
  const { title, content } = extractTranscriptSignals(transcriptPath);
  if (isTrivialTitle(title)) return 0;

  const completedAt = getISOTimestamp();
  const model = ASSISTANT_MODEL || detectModelFromTranscript(transcriptPath);
  const domain = detectDomain(transcriptPath || process.cwd());
  const project = detectProject(transcriptPath || process.cwd());
  const sessionType = detectSessionType(content || title);
  const mode = ((process.env.ENRICHMENT_MODE || 'inline').toLowerCase() as 'inline' | 'async' | 'hybrid');

  const { year, month, day, hours, minutes } = getDateComponents();
  const sessionDir = join(VAULT_PATH, 'Sessions', String(year), month);
  ensureDir(sessionDir);

  const filename = `${year}-${month}-${day}_${hours}${minutes}_${slugify(title, 40)}.md`;
  const filepath = join(sessionDir, filename);

  const request = {
    provider: 'codex' as const,
    title,
    summary: title,
    sessionType,
    transcriptPath,
    threadContent: content,
    domain,
    project,
  };

  if (mode === 'async' || mode === 'hybrid') {
    enqueueSessionEnrichment(VAULT_PATH, request, filepath);
  }

  const enrichment =
    mode === 'inline' || mode === 'hybrid'
      ? await runSessionIntelligence({
          request,
          vaultPath: VAULT_PATH,
          sourceSessionFilename: filename,
        })
      : undefined;

  const note = renderSessionNote({
    title,
    sessionId: hookInput.session_id || `codex-${Date.now()}`,
    domain,
    project,
    model,
    sessionType,
    createdAt: completedAt,
    completedAt,
    summary: title,
    assistantName: ASSISTANT_NAME,
    isc: { criteria: [], satisfaction: null },
    enrichment,
  });

  writeTextFile(filepath, note);
  console.error(`[CodexSessionCapture] Created: ${filename}`);
  return 0;
}

if (import.meta.main) {
  const code = await runCodexSessionEndHook();
  process.exit(code);
}
