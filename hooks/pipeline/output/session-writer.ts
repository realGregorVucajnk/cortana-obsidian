import { join } from 'path';
import { writeFileSync } from 'fs';
import type { Domain, SessionNotePayload } from '../../core/types';
import { renderSessionNote } from '../../core/render';
import { ensureDir, nextAvailableFilePath } from '../../core/io';
import { getDateString, slugify, detectSessionType } from '../../core/common';
import type { DiscoveredSession } from '../discovery/types';

/** Extraction result from the analysis module. */
export interface ExtractionResult {
  executive_summary: string[];
  key_decisions: Array<{ decision: string; rationale: string; confidence: number }>;
  digest: string;
  patterns: Array<{ title: string; summary: string; confidence: number }>;
  learnings: Array<{ title: string; summary: string; confidence: number }>;
  significance: number;
  action_items: string[];
  engine: string;
  model: string;
}

export interface PipelineSessionParams {
  session: DiscoveredSession;
  extraction: ExtractionResult;
  vaultPath: string;
  dryRun: boolean;
}

const PIPELINE_FOOTER = '*Auto-captured by DailyExtractionPipeline*';
const ORIGINAL_FOOTER = '*Auto-captured by ObsidianSessionCapture at session end*';

/**
 * Write a session note to the vault from pipeline extraction data.
 * Returns the written file path, or null if dryRun.
 */
export function writeSessionNote(params: PipelineSessionParams): string | null {
  const { session, extraction, vaultPath, dryRun } = params;

  const createdAt = new Date(session.createdAt).toISOString();
  const completedAt = new Date(session.lastActivityAt).toISOString();
  const date = getDateString(completedAt);
  const [year, month] = date.split('-');

  const payload: SessionNotePayload = {
    title: session.title,
    sessionId: session.id,
    domain: session.domain,
    project: session.project,
    model: session.model,
    sessionType: detectSessionType(session.title),
    createdAt,
    completedAt,
    summary: extraction.digest || extraction.executive_summary.join('\n'),
    assistantName: 'Cortana',
    isc: { criteria: [], satisfaction: null },
    enrichment: {
      executiveSummary: extraction.executive_summary,
      keyDecisions: extraction.key_decisions,
      digest: extraction.digest,
      recommendations: [],
      git: {
        available: false,
        repoRoot: '',
        branch: '',
        headSha: '',
        workingTreeFiles: 0,
        stagedFiles: 0,
        changedFiles: [],
        insertions: 0,
        deletions: 0,
      },
      summaryEngine: extraction.engine,
      summaryModel: extraction.model,
      distillCount:
        extraction.patterns.length +
        extraction.learnings.length +
        extraction.key_decisions.length,
      enrichmentMode: 'inline',
    },
  };

  let content = renderSessionNote(payload);

  // Replace the original footer with pipeline footer
  content = content.replace(ORIGINAL_FOOTER, PIPELINE_FOOTER);

  // Insert source: "daily-pipeline" after the status: line in frontmatter
  content = content.replace(
    /^(status: completed)/m,
    '$1\nsource: "daily-pipeline"',
  );

  const slug = slugify(session.title) || 'session';
  const dir = join(vaultPath, 'Sessions', year, month);
  const baseName = `${date}_${slug}`;

  if (dryRun) {
    const target = join(dir, `${baseName}.md`);
    console.error(`[output] (dry-run) Would write session note: ${target}`);
    return null;
  }

  ensureDir(dir);
  const filePath = nextAvailableFilePath(dir, baseName);
  writeFileSync(filePath, content, 'utf-8');
  console.error(`[output] Wrote session note: ${filePath}`);
  return filePath;
}
