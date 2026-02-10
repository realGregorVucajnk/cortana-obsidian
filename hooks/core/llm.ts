import type { Provider, SessionSummaryRequest } from './types';
import { sanitizeText } from './sanitize';

interface LLMResponse {
  executive_summary: string[];
  key_decisions: Array<{ decision: string; rationale: string; confidence: number }>;
  digest: string;
  recommendations: Array<{ kind: 'decision' | 'pattern' | 'learning'; title: string; summary: string; rationale: string; confidence: number }>;
}

function getProviderModel(provider: Provider): string {
  if (provider === 'claude') {
    return process.env.CLAUDE_SUMMARY_MODEL || process.env.SESSION_SUMMARY_MODEL || 'claude-3-5-haiku-latest';
  }
  return process.env.CODEX_SUMMARY_MODEL || process.env.SESSION_SUMMARY_MODEL || 'gpt-4.1-mini';
}

function getProviderMode(): 'openai' | 'ollama' {
  if ((process.env.LOCAL_SUMMARY_PROVIDER || '').toLowerCase() === 'ollama') return 'ollama';
  return 'openai';
}

function buildPrompt(input: SessionSummaryRequest, transcriptExcerpt: string, gitContext: string): string {
  const transcript = sanitizeText(transcriptExcerpt).slice(0, 8000);
  const thread = sanitizeText(input.threadContent).slice(0, 5000);

  return `You are summarizing an AI coding session for a practical engineering knowledge vault.
Return STRICT JSON only with this schema:
{
  "executive_summary": ["bullet1", "bullet2", "bullet3"],
  "key_decisions": [{"decision":"...","rationale":"...","confidence":0.0}],
  "digest": "short paragraph",
  "recommendations": [{"kind":"decision|pattern|learning","title":"...","summary":"...","rationale":"...","confidence":0.0}]
}

Session metadata:
- title: ${sanitizeText(input.title)}
- type: ${input.sessionType}
- domain: ${input.domain}
- project: ${sanitizeText(input.project || 'n/a')}

Git context:
${gitContext}

Thread snippet:
${thread || '(none)'}

Transcript excerpt:
${transcript || '(none)'}

Rules:
- Keep executive_summary to exactly 3 concise bullets.
- Keep digest under 120 words.
- Recommend only practical, durable items.
- Confidence must be between 0 and 1.
- If uncertain, lower confidence.
`;
}

function safeParse(responseText: string): LLMResponse | null {
  const trimmed = responseText.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) return null;

  try {
    const parsed = JSON.parse(trimmed.slice(first, last + 1));
    if (!Array.isArray(parsed.executive_summary) || typeof parsed.digest !== 'string') return null;
    return parsed as LLMResponse;
  } catch {
    return null;
  }
}

async function callOpenAICompatible(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI-compatible API error: ${res.status}`);
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content || '';
}

async function callOllama(model: string, prompt: string): Promise<string> {
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || model,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status}`);
  }

  const json = await res.json();
  return json?.response || '';
}

export async function generateLLMSummary(
  input: SessionSummaryRequest,
  transcriptExcerpt: string,
  gitContext: string,
): Promise<{ parsed: LLMResponse | null; engine: string; model: string }> {
  const providerMode = getProviderMode();
  const model = getProviderModel(input.provider);
  const prompt = buildPrompt(input, transcriptExcerpt, gitContext);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SESSION_SUMMARY_TIMEOUT_MS || 12000));

  try {
    let raw = '';
    if (providerMode === 'ollama') {
      raw = await callOllama(model, prompt);
    } else {
      raw = await callOpenAICompatible(model, prompt);
    }

    return {
      parsed: safeParse(raw),
      engine: providerMode,
      model,
    };
  } catch {
    return {
      parsed: null,
      engine: `${providerMode}-fallback`,
      model,
    };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
