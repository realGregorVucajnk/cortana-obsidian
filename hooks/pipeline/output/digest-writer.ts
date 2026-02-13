import { join } from 'path';
import { writeFileSync } from 'fs';
import type { Domain } from '../../core/types';
import { ensureDir } from '../../core/io';
import { getDateString } from '../../core/common';

export interface DigestSessionEntry {
  title: string;
  summary: string;
  domain: Domain;
  project: string;
}

export interface DigestParams {
  date: string;
  sessions: DigestSessionEntry[];
  narrative: string;
  themes: string[];
  connections: string[];
  unresolvedItems: string[];
  vaultPath: string;
  dryRun: boolean;
}

function mostCommonDomain(sessions: DigestSessionEntry[]): Domain {
  const counts: Record<Domain, number> = { work: 0, personal: 0, opensource: 0 };
  for (const s of sessions) counts[s.domain]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Domain) || 'personal';
}

function renderDigest(params: DigestParams): string {
  const { date, sessions, narrative, themes, connections, unresolvedItems } = params;
  const domain = mostCommonDomain(sessions);
  const projects = [...new Set(sessions.map((s) => s.project).filter(Boolean))];

  const sessionList = sessions
    .map((s) => `- **${s.title}** (${s.domain}${s.project ? ` / ${s.project}` : ''})\n  ${s.summary}`)
    .join('\n');

  const themeList = themes.length > 0
    ? themes.map((t) => `- ${t}`).join('\n')
    : '- No major themes identified.';

  const connectionList = connections.length > 0
    ? connections.map((c) => `- ${c}`).join('\n')
    : '- No cross-session connections identified.';

  const unresolvedList = unresolvedItems.length > 0
    ? unresolvedItems.map((u) => `- [ ] ${u}`).join('\n')
    : '- No unresolved items.';

  return `---
date: ${date}
type: session
session_type: digest
source: "daily-pipeline"
domain: ${domain}
status: completed
tags:
  - cortana-session
  - planning${projects.length > 0 ? `\nprojects:\n${projects.map((p) => `  - "${p}"`).join('\n')}` : ''}
summary: "Daily digest for ${date} — ${sessions.length} sessions"
---

# Daily Digest: ${date}

## Narrative

${narrative || 'No narrative generated.'}

## Sessions

${sessionList}

## Themes

${themeList}

## Cross-Session Connections

${connectionList}

## Unresolved Items

${unresolvedList}

---
*Auto-captured by DailyExtractionPipeline*
`;
}

/**
 * Write a daily digest note summarizing multiple sessions.
 * Returns the written file path, or null if dryRun.
 */
export function writeDigestNote(params: DigestParams): string | null {
  const { date, vaultPath, dryRun } = params;
  const dateStr = getDateString(date);
  const [year, month] = dateStr.split('-');
  const dir = join(vaultPath, 'Sessions', year, month);
  const fileName = `${dateStr}_digest.md`;
  const filePath = join(dir, fileName);

  const content = renderDigest(params);

  if (dryRun) {
    console.error(`[output] (dry-run) Would write digest: ${filePath}`);
    return null;
  }

  ensureDir(dir);
  writeFileSync(filePath, content, 'utf-8');
  console.error(`[output] Wrote digest: ${filePath}`);
  return filePath;
}
