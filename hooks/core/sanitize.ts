import { homedir } from 'os';

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{10,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /api[_-]?key\s*[:=]\s*[^\s]+/gi,
  /token\s*[:=]\s*[^\s]+/gi,
];

export function sanitizeText(input: string): string {
  if (!input) return '';

  let out = input;
  const home = homedir();
  out = out.split(home).join('~');

  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }

  return out;
}

export function sanitizeLines(lines: string[]): string[] {
  return lines.map((line) => sanitizeText(line));
}
