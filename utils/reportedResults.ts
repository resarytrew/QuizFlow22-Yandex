import type { SessionStatus } from '../types';

/** These results are client-reported; chronological order is not a ranking. */
export function sortReportedResults<T extends { created_at: string }>(items: readonly T[]): T[] {
  const time = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return [...items].sort((a, b) => time(b.created_at) - time(a.created_at));
}

export function reportedResultStatus(data: Record<string, unknown> | null | undefined): SessionStatus {
  return data?.abandoned === true ? 'abandoned' : 'completed';
}
