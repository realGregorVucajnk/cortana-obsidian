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

${note.enrichment ? `## Executive Summary\n\n${note.enrichment.executiveSummary.map((line) => `- ${line}`).join('\n')}\n\n## Key Decisions and Why\n\n${note.enrichment.keyDecisions.length > 0 ? note.enrichment.keyDecisions.map((d) => `- ${d.decision} (${Math.round(d.confidence * 100)}%)\\n  - Why: ${d.rationale}`).join('\n') : '- No explicit decisions extracted.'}\n\n## Recommended to Save\n\n${note.enrichment.recommendations.length > 0 ? note.enrichment.recommendations.map((r) => `- [${r.kind}] ${r.title} (${Math.round(r.confidence * 100)}%)\\n  - ${r.summary}\\n  - Why: ${r.rationale}`).join('\n') : '- No recommendations.'}\n\n## Digest\n\n${note.enrichment.digest}\n\n## Git Context\n\n${note.enrichment.git.available ? `- Repo: \`${note.enrichment.git.repoRoot}\`\\n- Branch: \`${note.enrichment.git.branch}\`\\n- HEAD: \`${note.enrichment.git.headSha}\`\\n- Changed files (working tree): ${note.enrichment.git.workingTreeFiles}\\n- Changed files (staged): ${note.enrichment.git.stagedFiles}\\n- Diff stats: +${note.enrichment.git.insertions} / -${note.enrichment.git.deletions}\\n- Top paths:\\n${note.enrichment.git.changedFiles.map((f) => `  - \`${f}\``).join('\n') || '  - (none)'}` : '- Git context unavailable.'}\n\n` : ''}

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
