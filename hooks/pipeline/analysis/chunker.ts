import type { TranscriptMessage } from './transcript-reader';

export type ChunkStrategy = 'full' | 'head-tail' | 'sampled';

export interface ChunkResult {
  strategy: ChunkStrategy;
  text: string;
}

function formatMessage(msg: TranscriptMessage): string {
  return `[${msg.role}] ${msg.content}`;
}

function formatMessages(msgs: TranscriptMessage[]): string {
  return msgs.map(formatMessage).join('\n');
}

/**
 * Chunk transcript messages to fit within a character budget.
 *
 * Strategies:
 * - 'full': all messages fit within maxChars
 * - 'head-tail': first 20 + last 40 messages (preserves intent + outcome)
 * - 'sampled': first 5 + every Kth user message + last 10 (for very long sessions)
 */
export function chunkTranscript(
  messages: TranscriptMessage[],
  maxChars: number = 8000,
): ChunkResult {
  if (messages.length === 0) {
    return { strategy: 'full', text: '' };
  }

  // Try full first
  const fullText = formatMessages(messages);
  if (fullText.length <= maxChars) {
    return { strategy: 'full', text: fullText };
  }

  // Try head-tail: first 20 + last 40
  const headCount = Math.min(20, messages.length);
  const tailCount = Math.min(40, messages.length - headCount);

  if (tailCount > 0) {
    const headMessages = messages.slice(0, headCount);
    const tailMessages = messages.slice(messages.length - tailCount);
    const headTailText = formatMessages(headMessages) + '\n...\n' + formatMessages(tailMessages);

    if (headTailText.length <= maxChars) {
      return { strategy: 'head-tail', text: headTailText };
    }
  }

  // Sampled: first 5 + every Kth user message + last 10
  const headSample = messages.slice(0, Math.min(5, messages.length));
  const tailSample = messages.slice(Math.max(messages.length - 10, 5));

  const middleMessages = messages.slice(5, Math.max(messages.length - 10, 5));
  const userMiddle = middleMessages.filter((m) => m.role === 'user');

  // Calculate K to stay within budget
  // Start with all user messages and reduce until it fits
  let sampledMiddle = userMiddle;
  let k = 1;

  while (k <= userMiddle.length) {
    sampledMiddle = userMiddle.filter((_, i) => i % k === 0);
    const candidate =
      formatMessages(headSample) +
      '\n...\n' +
      formatMessages(sampledMiddle) +
      '\n...\n' +
      formatMessages(tailSample);

    if (candidate.length <= maxChars) {
      return { strategy: 'sampled', text: candidate };
    }
    k++;
  }

  // Final fallback: just head + tail with truncation
  const fallback =
    formatMessages(headSample).slice(0, Math.floor(maxChars * 0.3)) +
    '\n...\n' +
    formatMessages(tailSample).slice(0, Math.floor(maxChars * 0.6));

  return { strategy: 'sampled', text: fallback.slice(0, maxChars) };
}
