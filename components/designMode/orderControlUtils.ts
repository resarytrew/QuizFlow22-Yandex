export function orderValueToElementOrder(value: string): string[] {
  const map: Record<string, string[]> = {
    'title-media-description-answers-cta': ['question-title', 'media', 'question-description', 'answers-container', 'primary-action'],
    'media-title-description-answers-cta': ['media', 'question-title', 'question-description', 'answers-container', 'primary-action'],
    'title-description-media-answers-cta': ['question-title', 'question-description', 'media', 'answers-container', 'primary-action'],
    'title-media-description-cta-answers': ['question-title', 'media', 'question-description', 'primary-action', 'answers-container'],
  };
  return map[value] ?? map['title-media-description-answers-cta'];
}

export function elementOrderToControlValue(value: unknown): string {
  if (!Array.isArray(value)) return 'title-media-description-answers-cta';
  const key = value.join('-')
    .replace('question-title', 'title')
    .replace('question-description', 'description')
    .replace('answers-container', 'answers')
    .replace('primary-action', 'cta');
  return [
    'title-media-description-answers-cta',
    'media-title-description-answers-cta',
    'title-description-media-answers-cta',
    'title-media-description-cta-answers',
  ].includes(key) ? key : 'title-media-description-answers-cta';
}
