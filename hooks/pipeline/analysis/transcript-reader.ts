import { readFileSync, existsSync } from 'fs';

export interface TranscriptMessage {
  role: string;
  content: string;
  timestamp?: string;
  model?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
}

function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as ContentBlock[])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text!)
      .join('\n');
  }
  return '';
}

/**
 * Parse Claude Code JSONL transcripts.
 * Each line is a JSON object with: role, content (string | ContentBlock[]),
 * optional model, optional timestamp.
 */
export function readCodeTranscript(path: string): TranscriptMessage[] {
  if (!existsSync(path)) return [];

  const messages: TranscriptMessage[] = [];
  const lines = readFileSync(path, 'utf-8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const entry = JSON.parse(trimmed);
      if (!entry.role || (entry.role !== 'user' && entry.role !== 'assistant')) continue;

      const content = extractContent(entry.content);
      if (!content) continue;

      const msg: TranscriptMessage = {
        role: entry.role,
        content,
      };

      if (entry.timestamp) msg.timestamp = String(entry.timestamp);
      if (entry.model) msg.model = String(entry.model);

      messages.push(msg);
    } catch {
      // Skip malformed lines
    }
  }

  return messages;
}

/**
 * Parse Claude Desktop audit.jsonl transcripts.
 * Each line has: type (user|assistant|system|tool_use_summary|tool_result),
 * content (ContentBlock[]), _audit_timestamp.
 */
export function readDesktopTranscript(path: string): TranscriptMessage[] {
  if (!existsSync(path)) return [];

  const messages: TranscriptMessage[] = [];
  const lines = readFileSync(path, 'utf-8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const entry = JSON.parse(trimmed);
      const type: string = entry.type;
      if (!type) continue;

      // Map desktop types to role names
      const roleMap: Record<string, string> = {
        user: 'user',
        assistant: 'assistant',
        system: 'system',
        tool_use_summary: 'tool',
        tool_result: 'tool_result',
      };

      const role = roleMap[type];
      if (!role) continue;

      const content = extractContent(entry.content);
      if (!content) continue;

      const msg: TranscriptMessage = {
        role,
        content,
      };

      if (entry._audit_timestamp) msg.timestamp = String(entry._audit_timestamp);
      if (entry.model) msg.model = String(entry.model);

      messages.push(msg);
    } catch {
      // Skip malformed lines
    }
  }

  return messages;
}
