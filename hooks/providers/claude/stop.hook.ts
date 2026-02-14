#!/usr/bin/env bun

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { detectDomain, detectProject, getDateString, getISOTimestamp, slugify } from '../../core/common';
import { extractLearningFromMessage, isLearningCapture } from '../../core/learning';
import { ensureDir, getLastAssistantMessage, nextAvailableFilePath, readHookStdin, writeTextFile } from '../../core/io';
import { renderLearningNote } from '../../core/render';

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const LEARNINGS_DIR = join(VAULT_PATH, 'Knowledge', 'learnings');

export async function runClaudeStopHook(): Promise<number> {
  const hookInput = await readHookStdin('ClaudeLearningSync');
  if (!hookInput) return 0;
  if (!existsSync(VAULT_PATH)) return 0;

  const transcriptPath = hookInput.transcript_path || '';
  const lastMessage = getLastAssistantMessage(transcriptPath);
  if (!lastMessage) return 0;
  if (!isLearningCapture(lastMessage)) return 0;

  ensureDir(LEARNINGS_DIR);

  const { title, insight } = extractLearningFromMessage(lastMessage);
  const baseName = `${getDateString()}_${slugify(title)}`;
  const filepath = nextAvailableFilePath(LEARNINGS_DIR, baseName);

  const note = renderLearningNote({
    title,
    insight,
    domain: detectDomain(transcriptPath),
    project: detectProject(transcriptPath),
    timestamp: getISOTimestamp(),
  });

  writeTextFile(filepath, note);
  console.error(`[ClaudeLearningSync] Created: ${filepath.split('/').pop() || baseName}.md`);
  return 0;
}

if (import.meta.main) {
  const code = await runClaudeStopHook();
  process.exit(code);
}
