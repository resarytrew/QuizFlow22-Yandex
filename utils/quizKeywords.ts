export const MAX_QUIZ_KEYWORDS = 8;
export const MAX_QUIZ_KEYWORD_LENGTH = 24;

export function normalizeQuizKeywords(input: unknown): string[] {
  const rawItems = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[,;\n]/)
      : [];

  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const item of rawItems) {
    const normalized = String(item)
      .trim()
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ')
      .slice(0, MAX_QUIZ_KEYWORD_LENGTH);
    const key = normalized.toLocaleLowerCase('ru-RU');

    if (!normalized || seen.has(key)) continue;

    seen.add(key);
    keywords.push(normalized);

    if (keywords.length >= MAX_QUIZ_KEYWORDS) break;
  }

  return keywords;
}

export function quizKeywordsToInput(input: unknown): string {
  return normalizeQuizKeywords(input).join(', ');
}
