import { describe, it, expect } from 'vitest';
import { mapContributionData } from '../src/lib/contrib';

describe('mapContributionData', () => {
  it('maps weeks schema to days and computes totals', () => {
    const raw = {
      from: '2025-01-01',
      to: '2025-01-07',
      total_contributions: 3,
      colors_full: ['#fff', '#a', '#b'],
      weeks: [
        {
          index: 0,
          first_day: '2025-01-01',
          contribution_days: [
            { weekday: 0, count: 0, level: 0 },
            { weekday: 1, count: 1, level: 1 },
            { weekday: 2, count: 1, level: 2 },
            { weekday: 3, count: 0, level: 0 },
            { weekday: 4, count: 0, level: 0 },
            { weekday: 5, count: 0, level: 0 },
            { weekday: 6, count: 0, level: 0 },
          ],
        },
      ],
    };
    const mapped = mapContributionData(raw, 'alice');
    expect(mapped.username).toBe('alice');
    expect(mapped.total).toBe(3);
    expect(mapped.days.length).toBe(7);
    expect(mapped.days[0].date).toBe('2025-01-01');
    expect(mapped.days[0].count).toBe(0);
    expect(mapped.days[2].count).toBe(1);
    expect(mapped.streak).toBe(2);
  });

  it('passes through already-mapped schema', () => {
    const raw = {
      username: 'bob',
      total: 5,
      streak: 1,
      startDate: '2025-02-01',
      endDate: '2025-02-07',
      days: [
        { date: '2025-02-01', count: 5, color: '#123' },
      ],
    };
    const mapped = mapContributionData(raw, 'ignored');
    expect(mapped.username).toBe('bob');
    expect(mapped.total).toBe(5);
    expect(mapped.streak).toBe(1);
    expect(mapped.days.length).toBe(1);
  });
});
