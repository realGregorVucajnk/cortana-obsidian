import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface VaultIndex {
  sessionIds: Set<string>;
  knowledgeSlugs: Set<string>;
  summaries: Map<string, string>;
  sessionDates: Map<string, string>;
}

function collectMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        results.push(...collectMarkdownFiles(full));
      } else if (entry.endsWith('.md')) {
        results.push(full);
      }
    } catch {
      // Skip unreadable entries
    }
  }
  return results;
}

function readFrontmatter(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const fd = readFileSync(filePath, 'utf-8');
    const lines = fd.split('\n').slice(0, 20);
    let inFrontmatter = false;
    for (const line of lines) {
      if (line.trim() === '---') {
        if (inFrontmatter) break;
        inFrontmatter = true;
        continue;
      }
      if (!inFrontmatter) continue;
      const match = line.match(/^([a-z_]+):\s*"?([^"]*)"?\s*$/);
      if (match) result[match[1]] = match[2].trim();
    }
  } catch {
    // Skip unreadable files
  }
  return result;
}

function extractSlugFromFilename(filename: string): string {
  // Strip YYYY-MM-DD_ prefix and .md suffix
  const withoutExt = filename.replace(/\.md$/, '');
  const withoutDate = withoutExt.replace(/^\d{4}-\d{2}-\d{2}_?/, '');
  return withoutDate;
}

export function buildVaultIndex(vaultPath: string): VaultIndex {
  const sessionIds = new Set<string>();
  const knowledgeSlugs = new Set<string>();
  const summaries = new Map<string, string>();
  const sessionDates = new Map<string, string>();

  // Index Sessions/**/*.md
  const sessionsDir = join(vaultPath, 'Sessions');
  const sessionFiles = collectMarkdownFiles(sessionsDir);
  for (const file of sessionFiles) {
    const fm = readFrontmatter(file);
    if (fm.session_id) {
      sessionIds.add(fm.session_id);
      if (fm.date) sessionDates.set(fm.session_id, fm.date);
    }
    if (fm.summary) {
      const key = fm.session_id || file;
      summaries.set(key, fm.summary);
    }
  }

  // Index Knowledge/**/*.md
  const knowledgeDir = join(vaultPath, 'Knowledge');
  const knowledgeFiles = collectMarkdownFiles(knowledgeDir);
  for (const file of knowledgeFiles) {
    const filename = file.split('/').pop() || '';
    const slug = extractSlugFromFilename(filename);
    if (slug) knowledgeSlugs.add(slug);

    const fm = readFrontmatter(file);
    if (fm.summary) {
      summaries.set(slug || file, fm.summary);
    }
  }

  console.error(
    `[vault-index] Indexed ${sessionIds.size} sessions, ${knowledgeSlugs.size} knowledge slugs, ${summaries.size} summaries`,
  );

  return { sessionIds, knowledgeSlugs, summaries, sessionDates };
}
