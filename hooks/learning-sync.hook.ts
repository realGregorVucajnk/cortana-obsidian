#!/usr/bin/env bun
/**
 * learning-sync.hook.ts — Sync learning moments to Obsidian (Stop handler)
 *
 * Standalone hook with no external dependencies. Copy to ~/.claude/hooks/ and
 * register in settings.json under Stop.
 *
 * Configuration:
 *   OBSIDIAN_VAULT env var — path to your vault (default: ~/obsidian-vault)
 *
 * Reads the Claude Code transcript from stdin and detects "learning moments"
 * based on keyword analysis. Creates knowledge notes in Knowledge/learnings/.
 *
 * Creates: Knowledge/learnings/YYYY-MM-DD_{slug}.md
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================================================
// Configuration
// ============================================================================

const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), 'obsidian-vault');
const LEARNINGS_DIR = join(VAULT_PATH, 'Knowledge', 'learnings');

// ============================================================================
// Types
// ============================================================================

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

// ============================================================================
// Helpers (inlined — no external dependencies)
// ============================================================================

function getISOTimestamp(): string {
  return new Date().toISOString();
}

function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function detectDomain(): string {
  const home = homedir();
  const cwd = process.cwd();
  if (cwd.includes(join(home, 'work'))) return 'work';
  if (cwd.includes(join(home, 'personal'))) return 'personal';
  if (cwd.includes(join(home, 'opensource'))) return 'opensource';
  return 'personal';
}

// ============================================================================
// Learning Detection
// ============================================================================

const LEARNING_KEYWORDS = [
  'lesson learned',
  'key takeaway',
  'important to note',
  'root cause was',
  'the fix was',
  'turns out',
  'gotcha',
  'pitfall',
  'best practice',
  'anti-pattern',
  'mistake was',
  'should have',
  'next time',
  'remember to',
  'discovered that',
  'realized that',
];

function isLearningCapture(lastMessage: string, summary?: string): boolean {
  const combined = `${lastMessage} ${summary || ''}`.toLowerCase();
  return LEARNING_KEYWORDS.some(keyword => combined.includes(keyword));
}

function extractLearningFromMessage(message: string): { title: string; insight: string } {
  // Try to find a heading or first meaningful sentence
  const lines = message.split('\n').filter(l => l.trim().length > 0);

  // Look for a heading
  const heading = lines.find(l => l.startsWith('#'));
  if (heading) {
    return {
      title: heading.replace(/^#+\s*/, '').slice(0, 100),
      insight: lines.slice(lines.indexOf(heading) + 1).join('\n').slice(0, 2000),
    };
  }

  // Use first line as title
  return {
    title: (lines[0] || 'Learning Captured').slice(0, 100),
    insight: lines.slice(1).join('\n').slice(0, 2000) || 'See session for details.',
  };
}

// ============================================================================
// Transcript Reading
// ============================================================================

function getLastAssistantMessage(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    // JSONL format — find last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.role === 'assistant' && entry.content) {
          if (typeof entry.content === 'string') return entry.content;
          if (Array.isArray(entry.content)) {
            return entry.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('\n');
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Can't read transcript
  }
  return '';
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
    console.error('[LearningSync] Error reading stdin:', error);
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
      process.exit(0);
    }

    // Get last assistant message from transcript
    const lastMessage = getLastAssistantMessage(hookInput.transcript_path);
    if (!lastMessage) {
      process.exit(0);
    }

    // Check if this is a learning moment
    if (!isLearningCapture(lastMessage)) {
      process.exit(0);
    }

    // Ensure learnings directory exists
    if (!existsSync(LEARNINGS_DIR)) {
      mkdirSync(LEARNINGS_DIR, { recursive: true });
    }

    const { title, insight } = extractLearningFromMessage(lastMessage);
    const date = getDateString();
    const domain = detectDomain();
    const slug = slugify(title);
    const filename = `${date}_${slug}.md`;
    const filepath = join(LEARNINGS_DIR, filename);

    // Don't overwrite existing learnings
    if (existsSync(filepath)) {
      process.exit(0);
    }

    const content = `---
date: ${getISOTimestamp()}
type: learning
domain: ${domain}
status: active
tags:
  - knowledge
  - learning
summary: "${title.replace(/"/g, '\\"')}"
---

# ${title}

## Insight

${insight}

---
*Auto-captured by learning-sync hook*
`;

    writeFileSync(filepath, content, 'utf-8');
    console.error(`[LearningSync] Created: ${filename}`);

    process.exit(0);
  } catch (error) {
    console.error(`[LearningSync] Error: ${error}`);
    process.exit(0);
  }
}

main();
