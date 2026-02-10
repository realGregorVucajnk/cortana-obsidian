import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { collectGitSnapshot } from './git';
import { getDateString, getISOTimestamp, slugify } from './common';
import { generateLLMSummary } from './llm';
import { readTranscriptExcerpt } from './io';
import { sanitizeLines, sanitizeText } from './sanitize';
import type { DistillCandidate, DistillKind, SessionEnrichment, SessionSummaryRequest } from './types';

function getEnvBool(name: string, defaultValue: boolean): boolean {
  const val = (process.env[name] || '').toLowerCase();
  if (!val) return defaultValue;
  return val === '1' || val === 'true' || val === 'yes' || val === 'on';
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatGitContextForPrompt(git: SessionEnrichment['git']): string {
  if (!git.available) return 'No git repository detected.';
  return [
    `repoRoot: ${git.repoRoot}`,
    `branch: ${git.branch}`,
    `headSha: ${git.headSha}`,
    `workingTreeFiles: ${git.workingTreeFiles}`,
    `stagedFiles: ${git.stagedFiles}`,
    `diff: +${git.insertions} / -${git.deletions}`,
    `changedFiles: ${git.changedFiles.join(', ') || '(none)'}`,
  ].join('\n');
}

function heuristicRecommendations(input: SessionSummaryRequest): DistillCandidate[] {
  const kind: DistillKind =
    input.sessionType === 'planning' || input.sessionType === 'review'
      ? 'decision'
      : input.sessionType === 'debugging'
        ? 'learning'
        : 'pattern';

  return [
    {
      kind,
      title: `${input.title} - ${kind}`,
      summary: `Auto-captured ${kind} candidate from ${input.sessionType} session.`,
      rationale: 'Session output appears durable and reusable.',
      confidence: 0.68,
    },
  ];
}

function heuristicEnrichment(input: SessionSummaryRequest, transcriptExcerpt: string, git: SessionEnrichment['git']): Omit<SessionEnrichment, 'distillCount' | 'enrichmentMode'> {
  const transcriptLines = transcriptExcerpt.split('\n').filter(Boolean);
  const lastLine = transcriptLines[transcriptLines.length - 1] || input.summary;

  return {
    executiveSummary: sanitizeLines([
      `Goal: ${input.title}`,
      `Work type: ${input.sessionType} in ${input.domain}/${input.project || 'general'}`,
      `Outcome: ${sanitizeText(lastLine).slice(0, 140)}`,
    ]),
    keyDecisions: [
      {
        decision: `Defaulted to ${input.sessionType} workflow for this session`,
        rationale: 'Inferred from transcript/thread content when explicit decisions were not available.',
        confidence: 0.45,
      },
    ],
    digest: sanitizeText((input.threadContent || transcriptExcerpt || input.summary).slice(0, 600)),
    recommendations: heuristicRecommendations(input),
    git,
    summaryEngine: 'heuristic-fallback',
    summaryModel: process.env.SESSION_SUMMARY_MODEL || '',
  };
}

function dedupeCandidate(vaultPath: string, candidate: DistillCandidate): boolean {
  const base =
    candidate.kind === 'decision'
      ? join(vaultPath, 'Knowledge', 'decisions')
      : candidate.kind === 'pattern'
        ? join(vaultPath, 'Knowledge', 'patterns')
        : join(vaultPath, 'Knowledge', 'learnings');

  if (!existsSync(base)) return false;
  const slug = slugify(candidate.title, 60);
  const files = readdirSync(base).filter((f) => f.endsWith('.md'));
  return files.some((f) => f.includes(slug));
}

function writeKnowledgeNote(vaultPath: string, candidate: DistillCandidate, sourceSessionFilename: string, domain: string, project: string): void {
  const folder =
    candidate.kind === 'decision'
      ? join(vaultPath, 'Knowledge', 'decisions')
      : candidate.kind === 'pattern'
        ? join(vaultPath, 'Knowledge', 'patterns')
        : join(vaultPath, 'Knowledge', 'learnings');

  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const date = getDateString();
  const slug = slugify(candidate.title, 60) || 'captured-item';
  const file = join(folder, `${date}_${slug}.md`);
  if (existsSync(file)) return;

  const tag = candidate.kind;
  const content = `---
date: ${date}
type: ${candidate.kind}
domain: ${domain}
status: active${project ? `\nproject: "${sanitizeText(project)}"` : ''}
tags:
  - knowledge
  - ${tag}
summary: "${sanitizeText(candidate.summary).replace(/"/g, '\\"')}"
source_sessions:
  - "[[${sourceSessionFilename.replace(/\.md$/, '')}]]"
---

# ${sanitizeText(candidate.title)}

## Context

Auto-extracted from session note: [[${sourceSessionFilename.replace(/\.md$/, '')}]].

## Insight

${sanitizeText(candidate.summary)}

## Rationale

${sanitizeText(candidate.rationale)}
`;

  writeFileSync(file, content, 'utf-8');
}

export async function runSessionIntelligence(params: {
  request: SessionSummaryRequest;
  vaultPath: string;
  sourceSessionFilename: string;
}): Promise<SessionEnrichment> {
  const mode = (process.env.ENRICHMENT_MODE || 'inline') as 'inline' | 'async' | 'hybrid';
  const enableSummary = getEnvBool('SESSION_SUMMARY_ENABLED', true);
  const enableDistill = getEnvBool('AUTO_DISTILL_ENABLED', true);
  const maxNotes = Number(process.env.AUTO_DISTILL_MAX_NOTES || 3);
  const confidenceThreshold = Number(process.env.AUTO_DISTILL_CONFIDENCE_THRESHOLD || 0.75);

  const transcriptExcerpt = readTranscriptExcerpt(params.request.transcriptPath, 120);
  const git = collectGitSnapshot(params.request.transcriptPath || params.request.workPath || process.cwd());

  let enrichmentBase = heuristicEnrichment(params.request, transcriptExcerpt, git);

  if (enableSummary) {
    const llm = await generateLLMSummary(params.request, transcriptExcerpt, formatGitContextForPrompt(git));
    if (llm.parsed) {
      enrichmentBase = {
        executiveSummary: sanitizeLines(llm.parsed.executive_summary.slice(0, 3)),
        keyDecisions: (llm.parsed.key_decisions || []).slice(0, 5).map((d) => ({
          decision: sanitizeText(d.decision || ''),
          rationale: sanitizeText(d.rationale || ''),
          confidence: clampConfidence(Number(d.confidence ?? 0.5)),
        })),
        digest: sanitizeText(llm.parsed.digest || '').slice(0, 1200),
        recommendations: (llm.parsed.recommendations || []).slice(0, 6).map((r) => ({
          kind: (r.kind || 'learning') as DistillKind,
          title: sanitizeText(r.title || 'Captured Insight').slice(0, 120),
          summary: sanitizeText(r.summary || ''),
          rationale: sanitizeText(r.rationale || ''),
          confidence: clampConfidence(Number(r.confidence ?? 0.5)),
        })),
        git,
        summaryEngine: llm.engine,
        summaryModel: llm.model,
      };
    }
  }

  let distillCount = 0;
  if (enableDistill) {
    const chosen = enrichmentBase.recommendations
      .filter((r) => r.confidence >= confidenceThreshold)
      .slice(0, maxNotes);

    for (const candidate of chosen) {
      if (dedupeCandidate(params.vaultPath, candidate)) continue;
      writeKnowledgeNote(
        params.vaultPath,
        candidate,
        params.sourceSessionFilename,
        params.request.domain,
        params.request.project,
      );
      distillCount += 1;
    }
  }

  return {
    ...enrichmentBase,
    distillCount,
    enrichmentMode: mode,
  };
}
