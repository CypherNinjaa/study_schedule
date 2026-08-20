import { describe, it, expect } from 'vitest';
import type { AppData, ISODate } from '@/types';
import { createDefaultData, emptyDailyLog } from '@/data/defaults';
import { applyStreakFreeze, freezesRemainingThisWeek, recomputeStreaks } from '@/services/streaks';

const NOW = '2026-01-15T00:00:00.000Z';

/** Log `study` minutes on a date so the study streak qualifies that day. */
function logStudy(data: AppData, date: ISODate, minutes: number): void {
  const log = emptyDailyLog(date);
  log.minutes.study = minutes;
  data.dailyLogs.push(log);
}

describe('streaks are derived from history (§12)', () => {
  it('counts consecutive qualifying days up to today', () => {
    const data = createDefaultData(NOW);
    const target = data.settings.targets.study; // 180
    for (const d of ['2026-01-13', '2026-01-14', '2026-01-15']) logStudy(data, d, target);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(3);
    expect(data.streaks.streaks.study.best).toBeGreaterThanOrEqual(3);
  });

  it('breaks the current run on a missed day but keeps the best', () => {
    const data = createDefaultData(NOW);
    const target = data.settings.targets.study;
    // A 3-day run ending on the 12th, then a gap, then today only.
    for (const d of ['2026-01-10', '2026-01-11', '2026-01-12', '2026-01-15']) logStudy(data, d, target);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(1);
    expect(data.streaks.streaks.study.best).toBe(3);
  });

  it('does not count a day below target', () => {
    const data = createDefaultData(NOW);
    logStudy(data, '2026-01-15', 30); // under the 180 target
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(0);
  });

  it('recomputes correctly after a retroactive edit', () => {
    const data = createDefaultData(NOW);
    const target = data.settings.targets.study;
    logStudy(data, '2026-01-14', target);
    logStudy(data, '2026-01-15', target);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(2);
    // Backfill the 13th — the streak should extend, not stay stale.
    logStudy(data, '2026-01-13', target);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(3);
  });
});

describe('controlled streak freeze (§12)', () => {
  it('protects a missed past day and decrements the weekly allowance', () => {
    const data = createDefaultData(NOW);
    const target = data.settings.targets.study;
    // Qualify today and two days ago, miss yesterday.
    logStudy(data, '2026-01-13', target);
    logStudy(data, '2026-01-15', target);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.study.current).toBe(1); // broken by the 14th

    expect(freezesRemainingThisWeek(data, 'study', '2026-01-15')).toBe(1);
    const res = applyStreakFreeze(data, 'study', '2026-01-14', '2026-01-15');
    expect(res.ok).toBe(true);
    expect(data.streaks.streaks.study.current).toBe(3); // 13–14–15 now unbroken
    expect(freezesRemainingThisWeek(data, 'study', '2026-01-15')).toBe(0);
  });

  it('refuses to freeze a future day', () => {
    const data = createDefaultData(NOW);
    const res = applyStreakFreeze(data, 'study', '2026-01-16', '2026-01-15');
    expect(res.ok).toBe(false);
  });

  it('refuses a day that already qualifies', () => {
    const data = createDefaultData(NOW);
    logStudy(data, '2026-01-15', data.settings.targets.study);
    const res = applyStreakFreeze(data, 'study', '2026-01-15', '2026-01-15');
    expect(res.ok).toBe(false);
  });

  it('enforces the weekly freeze cap', () => {
    const data = createDefaultData(NOW);
    // First freeze consumes the single weekly allowance.
    applyStreakFreeze(data, 'study', '2026-01-14', '2026-01-15');
    const res = applyStreakFreeze(data, 'study', '2026-01-13', '2026-01-15');
    expect(res.ok).toBe(false);
  });
});

describe('early wake streak qualifications', () => {
  it('qualifies wake up on or before wakeTime + 15 min and after 04:00', () => {
    const data = createDefaultData(NOW);
    data.settings.wakeTime = '05:00';
    const log = emptyDailyLog('2026-01-15');
    log.wokeAt = '05:10';
    data.dailyLogs.push(log);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.earlyWake.current).toBe(1);
  });

  it('rejects midnight and late-night wake times below 04:00 AM', () => {
    const data = createDefaultData(NOW);
    data.settings.wakeTime = '05:00';
    const log = emptyDailyLog('2026-01-15');
    log.wokeAt = '00:30'; // Late night / midnight study log
    data.dailyLogs.push(log);
    recomputeStreaks(data, '2026-01-15');
    expect(data.streaks.streaks.earlyWake.current).toBe(0);
  });
});
