let fallbackSequence = 0;

/** Create a new editor identifier without relying on clock precision. */
export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  fallbackSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${fallbackSequence.toString(36)}`;
}
