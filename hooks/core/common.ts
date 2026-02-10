import { basename, dirname } from 'path';
import { homedir } from 'os';
import type { Domain } from './types';

export function getISOTimestamp(): string {
  return new Date().toISOString();
}

export function getDateString(ts?: string): string {
  const d = ts ? new Date(ts) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateComponents(): { year: number; month: string; day: string; hours: string; minutes: string } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0'),
    hours: String(now.getHours()).padStart(2, '0'),
    minutes: String(now.getMinutes()).padStart(2, '0'),
  };
}

export function slugify(text: string, max = 50): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
}

export function normalizePath(path: string): string {
  try {
    return decodeURIComponent(path || '').replace(/\\/g, '/');
  } catch {
    return (path || '').replace(/\\/g, '/');
  }
}

export function detectDomain(path: string): Domain {
  const home = homedir().replace(/\\/g, '/');
  const normalized = normalizePath(path || process.cwd());

  if (normalized.includes(`${home}/work/`)) return 'work';
  if (normalized.includes(`${home}/personal/`)) return 'personal';
  if (normalized.includes(`${home}/opensource/`)) return 'opensource';
  return 'personal';
}

export function detectProject(path: string): string {
  const home = homedir().replace(/\\/g, '/');
  const normalized = normalizePath(path || process.cwd());
  const roots = [`${home}/work/`, `${home}/personal/`, `${home}/opensource/`];

  for (const root of roots) {
    if (normalized.includes(root)) {
      const after = normalized.split(root)[1] || '';
      const project = after.split('/').find(Boolean) || '';
      if (project) return project;
    }
  }

  if (normalized.includes('/.claude/projects/')) {
    const encoded = normalized.split('/.claude/projects/')[1]?.split('/')[0] || '';
    const cleaned = encoded.replace(/^-+/, '').split('-').filter(Boolean);
    if (cleaned.length > 0) return cleaned[cleaned.length - 1];
  }

  const parent = basename(dirname(normalized));
  return parent && parent !== '.' ? parent : '';
}

export function detectSessionType(content: string): string {
  const lower = content.toLowerCase();
  if (/implement|build|create|add feature|write code/.test(lower)) return 'implementation';
  if (/debug|fix|bug|error|troubleshoot/.test(lower)) return 'debugging';
  if (/research|investigate|find out/.test(lower)) return 'research';
  if (/plan|design|architect|strategy/.test(lower)) return 'planning';
  if (/review|audit|check|validate/.test(lower)) return 'review';
  if (/explore|browse|understand|learn/.test(lower)) return 'exploration';
  return 'implementation';
}

export function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([a-z_]+):\s*"?([^"]*)"?\s*$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function isTrivialTitle(title: string): boolean {
  const lower = (title || '').trim().toLowerCase();
  if (!lower) return true;
  return /^(ok|okay|thanks|thank you|thx|got it|nice|cool|hello|hi|hey|done|yep|yes)$/.test(lower);
}

export function parseDateOrFallback(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? fallbackMs : ts;
}
