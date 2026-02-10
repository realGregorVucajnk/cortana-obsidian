import type { ISCData, LearningNotePayload, SessionNotePayload } from './types';

function renderISC(isc: ISCData): string {
  if (isc.criteria.length === 0) return '';

  let out = '\n## Ideal State Criteria\n\n';
  for (const criterion of isc.criteria) {
    const check = isc.satisfaction ? '- [x]' : '- [ ]';
    out += `${check} ${criterion}\n`;
  }
  if (isc.satisfaction) {
    out += `\n**Result:** ${isc.satisfaction.satisfied}/${isc.satisfaction.total} satisfied\n`;
  }
  return out;
}

export function renderSessionNote(note: SessionNotePayload): string {
  const date = note.completedAt.split('T')[0] || note.createdAt.split('T')[0];
  const time = note.completedAt.split('T')[1]?.slice(0, 5) || '00:00';
  const tags = ['cortana-session', note.sessionType];
  const oneLine = note.summary.split('\n')[0].replace(/"/g, '\\"').slice(0, 200);

  const enrichmentBlock = note.enrichment
    ? (() => {
        const decisions =
          note.enrichment.keyDecisions.length > 0
            ? note.enrichment.keyDecisions
                .map((d) => `- ${d.decision} (${Math.round(d.confidence * 100)}%)\nWhy: ${d.rationale}`)
                .join('\n')
            : '- No explicit decisions extracted.';

        const recommendations =
          note.enrichment.recommendations.length > 0
            ? note.enrichment.recommendations
                .map(
                  (r) =>
                    `- [${r.kind}] ${r.title} (${Math.round(r.confidence * 100)}%)\n${r.summary}\nWhy: ${r.rationale}`,
                )
                .join('\n')
            : '- No recommendations.';

        const gitContext = note.enrichment.git.available
          ? [
              `- Repo: \`${note.enrichment.git.repoRoot}\``,
              `- Branch: \`${note.enrichment.git.branch}\``,
              `- HEAD: \`${note.enrichment.git.headSha}\``,
              `- Changed files (working tree): ${note.enrichment.git.workingTreeFiles}`,
              `- Changed files (staged): ${note.enrichment.git.stagedFiles}`,
              `- Diff stats: +${note.enrichment.git.insertions} / -${note.enrichment.git.deletions}`,
              '- Top paths:',
              ...(note.enrichment.git.changedFiles.length > 0
                ? note.enrichment.git.changedFiles.map((f) => `  - \`${f}\``)
                : ['  - (none)']),
            ].join('\n')
          : '- Git context unavailable.';

        return `## Executive Summary

${note.enrichment.executiveSummary.map((line) => `- ${line}`).join('\n')}

## Key Decisions and Why

${decisions}

## Recommended to Save

${recommendations}

## Digest

${note.enrichment.digest}

## Git Context

${gitContext}

`;
      })()
    : '';

  let content = `---
date: ${date}
time: "${time}"
type: session
session_type: ${note.sessionType}
domain: ${note.domain}
status: completed${note.model ? `\nmodel: ${note.model}` : ''}
${note.enrichment?.summaryEngine ? `summary_engine: ${note.enrichment.summaryEngine}` : ''}${note.enrichment?.summaryModel ? `\nsummary_model: ${note.enrichment.summaryModel}` : ''}${note.enrichment ? `\ndistill_count: ${note.enrichment.distillCount}\nenrichment_mode: ${note.enrichment.enrichmentMode}` : ''}
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
summary: "${oneLine}"
session_id: "${note.sessionId}"${note.project ? `\nproject: "${note.project}"` : ''}${note.isc.satisfaction ? `\nisc_satisfied: ${note.isc.satisfaction.satisfied}\nisc_total: ${note.isc.satisfaction.total}` : ''}
---

# ${note.title}

## Summary

${note.summary}

${enrichmentBlock}

## Session Details

| Field | Value |
|-------|-------|
| Session ID | \`${note.sessionId}\` |
| Domain | ${note.domain} |
| Type | ${note.sessionType} |
| Project | ${note.project || 'N/A'} |
| Started | ${note.createdAt} |
| Completed | ${note.completedAt || 'N/A'} |
| Assistant | ${note.assistantName} |
| Model | ${note.model || 'N/A'} |
`;

  content += renderISC(note.isc);
  content += '\n---\n*Auto-captured by ObsidianSessionCapture at session end*\n';
  return content;
}

export function renderLearningNote(note: LearningNotePayload): string {
  const escapedSummary = note.title.replace(/"/g, '\\"');

  return `---
date: ${note.timestamp}
type: learning
domain: ${note.domain}
status: active${note.project ? `\nproject: "${note.project}"` : ''}
tags:
  - knowledge
  - learning
summary: "${escapedSummary}"
---

# ${note.title}

## Insight

${note.insight}

---
*Auto-captured by ObsidianLearningSync handler*
`;
}
