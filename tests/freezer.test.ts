import { describe, expect, it } from 'vitest';
import { ageLevel, canTakeOne, daysSince, formatAge, formatDate, sortOldestFirst, today, type FreezerItem } from '../src/freezer/freezer.ts';

const now = new Date(2026, 10, 12, 21, 30); // 12 Nov 2026, evening

describe('freezer time', () => {
  it('counts whole days from the freezing date', () => {
    expect(daysSince('2026-11-12', now)).toBe(0);
    expect(daysSince('2026-11-11', now)).toBe(1);
    expect(daysSince('2026-09-14', now)).toBe(59);
    expect(daysSince('2026-11-20', now)).toBe(0); // future dates count as today
  });

  it('formats the age in the largest sensible unit', () => {
    expect([0, 1, 10, 14, 59, 63, 160, 800].map(formatAge)).toEqual(['i dag', '1 dag', '10 dage', '2 uger', '8 uger', '2 mdr', '5 mdr', '2 år']);
  });

  it('marks food older than three months', () => {
    expect([5, 45, 90].map(ageLevel)).toEqual(['fresh', 'ok', 'old']);
  });

  it('formats dates in Danish and adds the year only when needed', () => {
    expect(formatDate('2026-09-14', now)).toBe('14. sep');
    expect(formatDate('2025-12-01', now)).toBe('1. dec 2025');
    expect(today(now)).toBe('2026-11-12');
  });
});

describe('freezer actions', () => {
  it('takes one out of counts, not of weights', () => {
    expect(canTakeOne({ amount: 4, unit: null })).toBe(true);
    expect(canTakeOne({ amount: 2, unit: 'bøtter' })).toBe(true);
    expect(canTakeOne({ amount: 1, unit: null })).toBe(false);
    expect(canTakeOne({ amount: 500, unit: 'g' })).toBe(false);
  });

  it('sorts oldest first', () => {
    const it = (name: string, frozen_on: string) => ({ name, frozen_on }) as FreezerItem;
    expect(sortOldestFirst([it('b', '2026-11-01'), it('a', '2026-06-03'), it('c', '2026-11-01')]).map((x) => x.name)).toEqual(['a', 'b', 'c']);
  });
});
