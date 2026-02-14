const LEARNING_KEYWORDS = [
  'lesson learned',
  'key takeaway',
  'important to note',
  'root cause was',
  'the fix was',
  'turns out',
  'gotcha',
  'pitfall',
  'best practice',
  'anti-pattern',
  'mistake was',
  'should have',
  'next time',
  'remember to',
  'discovered that',
  'realized that',
];

export function isLearningCapture(lastMessage: string, summary?: string): boolean {
  const combined = `${lastMessage} ${summary || ''}`.toLowerCase();
  return LEARNING_KEYWORDS.some((keyword) => combined.includes(keyword));
}

export function extractLearningFromMessage(message: string): { title: string; insight: string } {
  const lines = message.split('\n').filter((l) => l.trim().length > 0);

  const heading = lines.find((l) => l.startsWith('#'));
  if (heading) {
    return {
      title: heading.replace(/^#+\s*/, '').slice(0, 100),
      insight: lines.slice(lines.indexOf(heading) + 1).join('\n').slice(0, 2000) || 'See session for details.',
    };
  }

  return {
    title: (lines[0] || 'Learning Captured').slice(0, 100),
    insight: lines.slice(1).join('\n').slice(0, 2000) || 'See session for details.',
  };
}
