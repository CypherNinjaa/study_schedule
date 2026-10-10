import { describe, it, expect } from 'vitest';
import { createDefaultData } from '@/data/defaults';
import { applyPenaltyXP, awardXP, levelFromXP, revokeXP, taskXP, xpForLevel, xpInRange } from '@/services/xp';

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

describe('XP revocation & penalty deduction', () => {
  it('deducts XP and clears refKey so user cannot farm unlimited XP', () => {
    const data = createDefaultData(NOW);
    // 1. Check habit -> award XP
    const granted = awardXP(data, {
      source: 'habit',
      refKey: 'habit:h1:2026-01-01',
      amount: 10,
      label: 'Exercise',
      date: '2026-01-01',
    });
    expect(granted).toBe(10);
    expect(data.xp.total).toBe(10);

    // 2. Uncheck habit -> revoke XP
    const revoked = revokeXP(data, {
      source: 'habit',
      refKey: 'habit:h1:2026-01-01',
      amount: 10,
      label: 'Exercise (unchecked)',
      date: '2026-01-01',
    });
    expect(revoked).toBe(10);
    expect(data.xp.total).toBe(0);
    expect(data.xp.awarded['habit:h1:2026-01-01']).toBeUndefined();

    // 3. Re-check habit -> can earn it again honestly
    const reGranted = awardXP(data, {
      source: 'habit',
      refKey: 'habit:h1:2026-01-01',
      amount: 10,
      label: 'Exercise',
      date: '2026-01-01',
    });
    expect(reGranted).toBe(10);
    expect(data.xp.total).toBe(10);

    // 4. Repeated check while already checked yields 0
    const duplicate = awardXP(data, {
      source: 'habit',
      refKey: 'habit:h1:2026-01-01',
      amount: 10,
      label: 'Exercise',
      date: '2026-01-01',
    });
    expect(duplicate).toBe(0);
    expect(data.xp.total).toBe(10);

    // 5. Uncheck again -> drops back to 0
    revokeXP(data, {
      source: 'habit',
      refKey: 'habit:h1:2026-01-01',
      amount: 10,
      label: 'Exercise (unchecked)',
      date: '2026-01-01',
    });
    expect(data.xp.total).toBe(0);
  });

  it('clamps total XP to 0 on excessive deduction or penalty', () => {
    const data = createDefaultData(NOW);
    data.xp.total = 5;
    applyPenaltyXP(data, {
      refKey: 'pen:test',
      amount: 20,
      label: 'Distraction penalty',
      date: '2026-01-01',
    });
    expect(data.xp.total).toBe(0);
  });

  it('correctly calculates net XP in date range after awards and revocations', () => {
    const data = createDefaultData(NOW);
    awardXP(data, { source: 'task', refKey: 'task:1', amount: 25, label: 'Task 1', date: '2026-01-01' });
    awardXP(data, { source: 'habit', refKey: 'habit:1', amount: 10, label: 'Habit 1', date: '2026-01-01' });
    expect(xpInRange(data, '2026-01-01', '2026-01-01')).toBe(35);

    // Revoke habit
    revokeXP(data, { source: 'habit', refKey: 'habit:1', amount: 10, label: 'Habit 1 (unchecked)', date: '2026-01-01' });
    expect(xpInRange(data, '2026-01-01', '2026-01-01')).toBe(25);
  });
});

describe('task XP weighting (§13)', () => {
  it('scales with difficulty and priority', () => {
    expect(taskXP(1, 'low')).toBeLessThan(taskXP(5, 'critical'));
    expect(taskXP(3, 'high')).toBeGreaterThan(taskXP(3, 'low'));
  });
});

