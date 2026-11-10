import { describe, expect, it } from 'vitest';
import { reportedResultStatus, sortReportedResults } from './reportedResults';

describe('client-reported results', () => {
  it('orders by time rather than presenting client scores as a ranking', () => {
    const rows = [{ created_at: '2026-01-01T00:00:00Z', score: 999 }, { created_at: '2026-01-02T00:00:00Z', score: 1 }];
    expect(sortReportedResults(rows).map(row => row.score)).toEqual([1, 999]);
    expect(rows[0].score).toBe(999);
  });
  it('distinguishes abandonment from a completed result', () => {
    expect(reportedResultStatus({ abandoned: true })).toBe('abandoned');
    expect(reportedResultStatus({})).toBe('completed');
  });
});
