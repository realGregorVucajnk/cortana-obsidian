import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { HookInput } from './types';

export async function readHookStdin(tag: string): Promise<HookInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 500));
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);
    if (!input.trim()) return null;
    return JSON.parse(input) as HookInput;
  } catch (error) {
    console.error(`[${tag}] Error reading stdin:`, error);
    return null;
  }
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function writeTextFile(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8');
}

export function getLastAssistantMessage(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

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
        // Ignore malformed lines.
      }
    }
  } catch {
    // Ignore transcript read failures.
  }
  return '';
}

export function detectModelFromTranscript(transcriptPath: string): string {
  if (!transcriptPath || !existsSync(transcriptPath)) return '';

  try {
    const lines = readFileSync(transcriptPath, 'utf-8').split('\n').filter((l) => l.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        const model = entry?.model || entry?.message?.model || entry?.metadata?.model || '';
        if (typeof model === 'string' && model.length > 0) return model;
      } catch {
        // Ignore malformed lines.
      }
    }
  } catch {
    // Ignore transcript read failures.
  }

  return '';
}

export function nextAvailableFilePath(baseDir: string, baseName: string): string {
  const first = join(baseDir, `${baseName}.md`);
  if (!existsSync(first)) return first;

  let counter = 2;
  while (true) {
    const candidate = join(baseDir, `${baseName}_${counter}.md`);
    if (!existsSync(candidate)) return candidate;
    counter += 1;
  }
}
