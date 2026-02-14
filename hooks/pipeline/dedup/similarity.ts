import type { VaultIndex } from './vault-index';

export function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string): Set<string> =>
    new Set(
      s
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0),
    );

  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.7;

export function isDuplicateSession(sessionId: string, index: VaultIndex): boolean {
  return index.sessionIds.has(sessionId);
}

export function isDuplicateKnowledge(slug: string, summary: string, index: VaultIndex): boolean {
  // Level 1: Exact slug match
  if (index.knowledgeSlugs.has(slug)) return true;

  // Level 2: Jaccard similarity on summaries
  for (const [, existingSummary] of index.summaries) {
    if (jaccardSimilarity(summary, existingSummary) >= SIMILARITY_THRESHOLD) {
      return true;
    }
  }

  return false;
}
