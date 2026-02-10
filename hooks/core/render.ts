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
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
summary: "${oneLine}"
session_id: "${note.sessionId}"${note.project ? `\nproject: "${note.project}"` : ''}${note.isc.satisfaction ? `\nisc_satisfied: ${note.isc.satisfaction.satisfied}\nisc_total: ${note.isc.satisfaction.total}` : ''}
---

# ${note.title}

## Summary

${note.summary}

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
