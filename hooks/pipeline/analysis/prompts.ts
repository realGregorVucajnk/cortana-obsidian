import { sanitizeText } from '../../core/sanitize';

export interface ExtractionPromptParams {
  title: string;
  sessionType: string;
  domain: string;
  project: string;
  transcript: string;
}

export interface DigestPromptParams {
  date: string;
  sessions: Array<{
    title: string;
    summary: string;
    domain: string;
    project: string;
  }>;
}

/**
 * Build a prompt for extracting structured knowledge from a single session transcript.
 * Requests strict JSON with executive_summary, key_decisions, digest, patterns, learnings,
 * significance, and action_items.
 */
export function buildExtractionPrompt(params: ExtractionPromptParams): string {
  const { title, sessionType, domain, project, transcript } = params;

  return `You are extracting structured knowledge from an AI coding session transcript.
Return STRICT JSON only — no markdown fences, no explanation. Use this exact schema:

{
  "executive_summary": ["bullet1", "bullet2", "bullet3"],
  "key_decisions": [
    {"decision": "what was decided", "rationale": "why", "confidence": 0.0}
  ],
  "digest": "short paragraph summarizing the session (max 120 words)",
  "patterns": [
    {"title": "pattern name", "summary": "description", "confidence": 0.0}
  ],
  "learnings": [
    {"title": "learning title", "summary": "what was learned", "confidence": 0.0}
  ],
  "significance": 0.0,
  "action_items": ["item1", "item2"]
}

Session metadata:
- title: ${sanitizeText(title)}
- type: ${sessionType}
- domain: ${domain}
- project: ${sanitizeText(project || 'n/a')}

Transcript:
${sanitizeText(transcript)}

Rules:
- executive_summary: exactly 3 concise bullets capturing the core work done.
- key_decisions: architectural or design choices made. Empty array if none.
- digest: a readable paragraph under 120 words.
- patterns: reusable approaches or techniques discovered. Empty array if none.
- learnings: lessons learned from what worked or failed. Empty array if none.
- significance: 0.0 (trivial) to 1.0 (highly impactful). Consider scope, novelty, and reusability.
- action_items: concrete next steps identified. Empty array if none.
- confidence: 0.0 to 1.0 for each item. Lower if uncertain.
- Omit sensitive values (API keys, tokens). Focus on durable knowledge.
`;
}

/**
 * Build a prompt for synthesizing a daily digest across multiple sessions.
 * Used when a day has 2+ sessions to find cross-session themes and connections.
 */
export function buildDigestPrompt(params: DigestPromptParams): string {
  const { date, sessions } = params;

  const sessionList = sessions
    .map(
      (s, i) =>
        `${i + 1}. "${sanitizeText(s.title)}" (${s.domain}/${sanitizeText(s.project || 'general')}) — ${sanitizeText(s.summary)}`,
    )
    .join('\n');

  return `You are synthesizing a daily knowledge digest from multiple AI coding sessions.
Return STRICT JSON only — no markdown fences, no explanation. Use this exact schema:

{
  "narrative": "A cohesive 2-3 paragraph summary of the day's work",
  "themes": ["theme1", "theme2"],
  "connections": [
    "how session X relates to session Y"
  ],
  "unresolved_items": ["item that needs follow-up"]
}

Date: ${date}

Sessions:
${sessionList}

Rules:
- narrative: weave the sessions into a coherent story of the day's progress (150-250 words).
- themes: 2-5 high-level themes that span multiple sessions.
- connections: how sessions relate to each other (shared goals, sequential work, etc). Empty array if sessions are unrelated.
- unresolved_items: open questions, blockers, or incomplete work that needs attention. Empty array if none.
- Focus on practical engineering insights, not meta-commentary.
`;
}
