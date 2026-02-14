import type { DiscoveredSession } from '../discovery/types';
import type { TranscriptMessage } from './transcript-reader';
import { readCodeTranscript, readDesktopTranscript } from './transcript-reader';
import { chunkTranscript } from './chunker';
import { buildExtractionPrompt } from './prompts';
import { sanitizeText } from '../../core/sanitize';
import { detectSessionType } from '../../core/common';

export interface ExtractionOptions {
  llmModel?: string;
  llmTimeout?: number;
  delayMs?: number;
  dryRun?: boolean;
}

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

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_DELAY = 1_000;

// --- LLM via headless Claude CLI ---

function safeParse<T>(responseText: string): T | null {
  const trimmed = responseText.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first < 0 || last < first) return null;

  try {
    return JSON.parse(trimmed.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}

async function callLLM(model: string, prompt: string, timeout: number): Promise<string> {
  const proc = Bun.spawn(
    ['claude', '-p', '--model', model, '--output-format', 'text'],
    { stdin: new Response(prompt), stdout: 'pipe', stderr: 'pipe', timeout },
  );

  const [output, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`claude CLI exited ${exitCode}: ${stderr.slice(0, 200)}`);
  }

  return output;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Heuristic fallback ---

function heuristicExtraction(messages: TranscriptMessage[], session: DiscoveredSession): ExtractionResult {
  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  // Build a basic summary from available content
  const firstUser = userMessages[0]?.content.slice(0, 200) || 'No user messages';
  const lastAssistant = assistantMessages[assistantMessages.length - 1]?.content.slice(0, 200) || 'No assistant response';

  return {
    executive_summary: [
      `Session: ${sanitizeText(session.title)}`,
      `${userMessages.length} user messages, ${assistantMessages.length} assistant responses`,
      `Initial request: ${sanitizeText(firstUser.split('\n')[0])}`,
    ],
    key_decisions: [],
    digest: sanitizeText(
      `${session.title}. The session involved ${messages.length} exchanges. ` +
        `Started with: "${firstUser.split('\n')[0]}". ` +
        `Final response addressed: "${lastAssistant.split('\n')[0]}".`,
    ),
    patterns: [],
    learnings: [],
    significance: 0.3,
    action_items: [],
    engine: 'heuristic',
    model: 'none',
  };
}

// --- Main extraction ---

/**
 * Extract structured knowledge from a session transcript using LLM analysis
 * with heuristic fallback on failure.
 */
export async function extractSessionKnowledge(
  session: DiscoveredSession,
  opts: ExtractionOptions = {},
): Promise<ExtractionResult> {
  const model = opts.llmModel || process.env.PIPELINE_LLM_MODEL || DEFAULT_MODEL;
  const timeout = opts.llmTimeout ?? DEFAULT_TIMEOUT;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY;

  // Step 1: Read transcript using appropriate parser
  let messages: TranscriptMessage[];
  if (session.source === 'claude-desktop') {
    messages = readDesktopTranscript(session.transcriptPath);
  } else {
    messages = readCodeTranscript(session.transcriptPath);
  }

  if (messages.length === 0) {
    return {
      ...heuristicExtraction([], session),
      engine: 'heuristic-empty',
    };
  }

  // Step 2: Chunk the transcript
  const { text: transcript } = chunkTranscript(messages);

  // Step 3: Dry run short-circuits before LLM call
  if (opts.dryRun) {
    return heuristicExtraction(messages, session);
  }

  // Step 4: Build prompt and call LLM
  const prompt = buildExtractionPrompt({
    title: session.title,
    sessionType: detectSessionType(session.title),
    domain: session.domain,
    project: session.project || '',
    transcript,
  });

  // Rate limit delay
  if (delayMs > 0) {
    await delay(delayMs);
  }

  try {
    const raw = await callLLM(model, prompt, timeout);
    const parsed = safeParse<ExtractionResult>(raw);

    if (parsed && Array.isArray(parsed.executive_summary) && typeof parsed.digest === 'string') {
      return {
        executive_summary: parsed.executive_summary,
        key_decisions: Array.isArray(parsed.key_decisions) ? parsed.key_decisions : [],
        digest: parsed.digest,
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
        learnings: Array.isArray(parsed.learnings) ? parsed.learnings : [],
        significance: typeof parsed.significance === 'number' ? parsed.significance : 0.5,
        action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
        engine: 'claude-headless',
        model,
      };
    }

    // Parse succeeded but schema didn't match — fall through to heuristic
    return {
      ...heuristicExtraction(messages, session),
      engine: 'heuristic-parse-fail',
      model,
    };
  } catch {
    // LLM call failed — use heuristic
    return {
      ...heuristicExtraction(messages, session),
      engine: 'heuristic-llm-error',
      model,
    };
  }
}
