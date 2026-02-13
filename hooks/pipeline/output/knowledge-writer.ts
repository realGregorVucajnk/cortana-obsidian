import { join } from 'path';
import { writeFileSync } from 'fs';
import type { Domain, DistillCandidate, DistillKind } from '../../core/types';
import { ensureDir, nextAvailableFilePath } from '../../core/io';
import { getDateString, slugify } from '../../core/common';
import { sanitizeText } from '../../core/sanitize';
import type { VaultIndex } from '../dedup/vault-index';
import { isDuplicateKnowledge } from '../dedup/similarity';

export interface PipelineKnowledgeParams {
  patterns: Array<{ title: string; summary: string; confidence: number }>;
  learnings: Array<{ title: string; summary: string; confidence: number }>;
  decisions: Array<{ decision: string; rationale: string; confidence: number }>;
  sourceSessionFilename: string;
  domain: Domain;
  project: string;
  vaultPath: string;
  confidenceThreshold: number;
  vaultIndex: VaultIndex;
  dryRun: boolean;
}

const FOLDER_MAP: Record<DistillKind, string> = {
  decision: 'decisions',
  pattern: 'patterns',
  learning: 'learnings',
};

function toDistillCandidate(
  kind: DistillKind,
  item: { title?: string; decision?: string; summary?: string; rationale?: string; confidence: number },
): DistillCandidate {
  return {
    kind,
    title: sanitizeText(item.title || item.decision || 'Untitled'),
    summary: sanitizeText(item.summary || ''),
    rationale: sanitizeText(item.rationale || ''),
    confidence: item.confidence,
  };
}

function writeOneKnowledgeNote(
  vaultPath: string,
  candidate: DistillCandidate,
  sourceSessionFilename: string,
  domain: Domain,
  project: string,
  dryRun: boolean,
): string | null {
  const folder = join(vaultPath, 'Knowledge', FOLDER_MAP[candidate.kind]);
  const date = getDateString();
  const slug = slugify(candidate.title, 60) || 'captured-item';
  const baseName = `${date}_${slug}`;

  if (dryRun) {
    const target = join(folder, `${baseName}.md`);
    console.error(`[output] (dry-run) Would write ${candidate.kind} note: ${target}`);
    return null;
  }

  ensureDir(folder);
  const filePath = nextAvailableFilePath(folder, baseName);

  const escapedSummary = candidate.summary.replace(/"/g, '\\"');
  const content = `---
date: ${date}
type: ${candidate.kind}
domain: ${domain}
status: active
source: "daily-pipeline"
extraction_confidence: ${candidate.confidence}${project ? `\nproject: "${sanitizeText(project)}"` : ''}
tags:
  - knowledge
  - ${candidate.kind}
summary: "${escapedSummary}"
source_sessions:
  - "[[${sourceSessionFilename.replace(/\.md$/, '')}]]"
---

# ${candidate.title}

## Context

Auto-extracted from session note: [[${sourceSessionFilename.replace(/\.md$/, '')}]].

## Insight

${candidate.summary}

## Rationale

${candidate.rationale}

---
*Auto-captured by DailyExtractionPipeline*
`;

  writeFileSync(filePath, content, 'utf-8');
  console.error(`[output] Wrote ${candidate.kind} note: ${filePath}`);
  return filePath;
}

/**
 * Write knowledge notes (decisions, patterns, learnings) from pipeline extraction.
 * Only items above the confidence threshold that are not duplicates are written.
 * Returns array of written file paths.
 */
export function writeKnowledgeNotes(params: PipelineKnowledgeParams): string[] {
  const {
    patterns,
    learnings,
    decisions,
    sourceSessionFilename,
    domain,
    project,
    vaultPath,
    confidenceThreshold,
    vaultIndex,
    dryRun,
  } = params;

  const candidates: DistillCandidate[] = [
    ...decisions.map((d) => toDistillCandidate('decision', d)),
    ...patterns.map((p) => toDistillCandidate('pattern', p)),
    ...learnings.map((l) => toDistillCandidate('learning', l)),
  ];

  const written: string[] = [];

  for (const candidate of candidates) {
    if (candidate.confidence < confidenceThreshold) {
      console.error(
        `[output] Skipped ${candidate.kind} "${candidate.title}" (confidence ${candidate.confidence} < ${confidenceThreshold})`,
      );
      continue;
    }

    const slug = slugify(candidate.title, 60);
    if (isDuplicateKnowledge(slug, candidate.summary, vaultIndex)) {
      console.error(`[output] Skipped duplicate ${candidate.kind}: "${candidate.title}"`);
      continue;
    }

    const path = writeOneKnowledgeNote(
      vaultPath,
      candidate,
      sourceSessionFilename,
      domain,
      project,
      dryRun,
    );

    if (path) written.push(path);
  }

  console.error(`[output] Knowledge notes written: ${written.length}`);
  return written;
}
