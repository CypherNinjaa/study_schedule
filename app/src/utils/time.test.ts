import { describe, expect, it } from 'vitest';
import { daysAgo, daysUntil, isFuture, isPast, isToday } from './time';
import { diffDaysISO } from './date';

describe('Date & Time helpers', () => {
  it('diffDaysISO returns positive when first arg is later', () => {
    expect(diffDaysISO('2026-08-25', '2026-08-20')).toBe(5);
    expect(diffDaysISO('2026-08-15', '2026-08-20')).toBe(-5);
    expect(diffDaysISO('2026-08-20', '2026-08-20')).toBe(0);
  });

  it('daysUntil returns positive for future dates', () => {
    expect(daysUntil('2026-08-25', '2026-08-20')).toBe(5);
    expect(daysUntil('2026-08-15', '2026-08-20')).toBe(-5);
    expect(daysUntil('2026-08-20', '2026-08-20')).toBe(0);
  });

  it('daysAgo returns positive for past dates', () => {
    expect(daysAgo('2026-08-15', '2026-08-20')).toBe(5);
    expect(daysAgo('2026-08-25', '2026-08-20')).toBe(-5);
  });

  it('isPast, isFuture, and isToday evaluate correctly', () => {
    expect(isPast('2026-08-19', '2026-08-20')).toBe(true);
    expect(isPast('2026-08-21', '2026-08-20')).toBe(false);

    expect(isFuture('2026-08-21', '2026-08-20')).toBe(true);
    expect(isFuture('2026-08-19', '2026-08-20')).toBe(false);

    expect(isToday('2026-08-20', '2026-08-20')).toBe(true);
    expect(isToday('2026-08-21', '2026-08-20')).toBe(false);
  });
});
