import { describe, it, expect } from 'vitest';
import { createDefaultData } from '@/data/defaults';
import { awardXP, levelFromXP, taskXP, xpForLevel, xpInRange } from '@/services/xp';

const NOW = '2026-01-01T00:00:00.000Z';

describe('level curve (§14)', () => {
  it('matches the spec anchor points', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(250);
    expect(xpForLevel(4)).toBe(450);
    expect(xpForLevel(5)).toBe(700);
  });

  it('inverts cleanly: XP at the start of a level lands on that level', () => {
    for (let level = 1; level <= 20; level++) {
      expect(levelFromXP(xpForLevel(level)).level).toBe(level);
      // One XP short of the threshold is still the previous level.
      if (level > 1) expect(levelFromXP(xpForLevel(level) - 1).level).toBe(level - 1);
    }
  });

  it('never reports a negative level or progress', () => {
    const info = levelFromXP(-50);
    expect(info.level).toBe(1);
    expect(info.progress).toBeGreaterThanOrEqual(0);
  });
});

describe('anti-farming XP ledger (§13)', () => {
  it('awards a refKey once and ignores repeats', () => {
    const data = createDefaultData(NOW);
    const first = awardXP(data, { source: 'task', refKey: 'task:abc', amount: 20, label: 'Task', date: '2026-01-01' });
    const second = awardXP(data, { source: 'task', refKey: 'task:abc', amount: 20, label: 'Task', date: '2026-01-01' });
    expect(first).toBe(20);
    expect(second).toBe(0);
    expect(data.xp.total).toBe(20);
    expect(data.xp.entries).toHaveLength(1);
  });

  it('rejects non-positive amounts without touching the total', () => {
    const data = createDefaultData(NOW);
    expect(awardXP(data, { source: 'task', refKey: 'x', amount: 0, label: '', date: '2026-01-01' })).toBe(0);
    expect(awardXP(data, { source: 'task', refKey: 'y', amount: -5, label: '', date: '2026-01-01' })).toBe(0);
    expect(data.xp.total).toBe(0);
  });

  it('sums XP within a date range from the ledger', () => {
    const data = createDefaultData(NOW);
    awardXP(data, { source: 'task', refKey: 'a', amount: 10, label: '', date: '2026-01-01' });
    awardXP(data, { source: 'task', refKey: 'b', amount: 15, label: '', date: '2026-01-05' });
    awardXP(data, { source: 'task', refKey: 'c', amount: 30, label: '', date: '2026-02-01' });
    expect(xpInRange(data, '2026-01-01', '2026-01-31')).toBe(25);
  });
});

describe('task XP weighting (§13)', () => {
  it('scales with difficulty and priority', () => {
    expect(taskXP(1, 'low')).toBeLessThan(taskXP(5, 'critical'));
    expect(taskXP(3, 'high')).toBeGreaterThan(taskXP(3, 'low'));
  });
});
