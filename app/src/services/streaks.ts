import type { AppData, ISODate, StreakKey } from '@/types';
import { addDaysISO, diffDaysISO, hhmmToMinutes, isSameISOWeek, todayISO } from '@/utils/date';
import { computeDayMetrics, buildIndex, habitsDueOn, type DayMetrics, type MetricsIndex } from './metrics';

export interface StreakRule {
  key: StreakKey;
  label: string;
  icon: string;
  description: (data: AppData) => string;
  qualifies: (data: AppData, m: DayMetrics) => boolean;
}

export const STREAK_RULES: StreakRule[] = [
  {
    key: 'study',
    label: 'Study',
    icon: 'Flame',
    description: (d) => `Hit ${d.settings.targets.study} min of study`,
    qualifies: (d, m) => m.studyMinutes >= d.settings.targets.study && d.settings.targets.study > 0,
  },
  {
    key: 'coding',
    label: 'Coding',
    icon: 'Code2',
    description: (d) => `Hit ${d.settings.targets.coding} min of coding`,
    qualifies: (d, m) => m.codingMinutes >= d.settings.targets.coding && d.settings.targets.coding > 0,
  },
  {
    key: 'exercise',
    label: 'Exercise',
    icon: 'Activity',
    description: (d) => `Move for ${d.settings.targets.exercise} min`,
    qualifies: (d, m) => m.exerciseMinutes >= d.settings.targets.exercise && d.settings.targets.exercise > 0,
  },
  {
    key: 'earlyWake',
    label: 'Early wake',
    icon: 'Sun',
    description: (d) => `Wake up by ${d.settings.wakeTime}`,
    // A 15-minute grace window keeps the streak humane.
    // The 4:00 AM floor prevents late-night logging (00:30, 01:00, etc.) from
    // wrongly counting as an early wake.
    qualifies: (d, m) =>
      m.wokeAt !== null &&
      hhmmToMinutes(m.wokeAt) >= 240 &&
      hhmmToMinutes(m.wokeAt) <= hhmmToMinutes(d.settings.wakeTime) + 15,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: 'CheckSquare',
    description: () => 'Complete every planned task',
    qualifies: (_d, m) => m.tasksTotal > 0 && m.tasksCompleted === m.tasksTotal,
  },
  {
    key: 'habits',
    label: 'Habits',
    icon: 'Compass',
    description: () => 'Complete all habits due today',
    qualifies: (d, m) => {
      const due = habitsDueOn(d.habits, m.date).length;
      return due > 0 && m.habitsDone >= due;
    },
  },
];

export function ruleFor(key: StreakKey): StreakRule {
  const rule = STREAK_RULES.find((r) => r.key === key);
  if (!rule) throw new Error(`Unknown streak: ${key}`);
  return rule;
}

/**
 * Recomputes every streak from the full history. Deriving rather than
 * incrementing means edits to past days (logging yesterday's study late,
 * for example) always produce a correct streak.
 *
 * A day counts if the rule qualifies, or if a freeze was spent on it.
 * Today never breaks a streak — it is simply "not yet earned".
 */
export function recomputeStreaks(
  data: AppData,
  today: ISODate = todayISO(),
  index: MetricsIndex = buildIndex(data),
): void {
  const dates = collectHistoryDates(data, today);

  // One metrics pass shared by every rule.
  const metricsByDate = new Map<ISODate, DayMetrics>();
  for (const date of dates) metricsByDate.set(date, computeDayMetrics(data, date, index));

  for (const rule of STREAK_RULES) {
    const streak = data.streaks.streaks[rule.key];
    const freezes = new Set(streak.freezesUsed.map((f) => f.date));

    const qualified = new Set<ISODate>();
    for (const [date, m] of metricsByDate) {
      if (rule.qualifies(data, m) || freezes.has(date)) qualified.add(date);
    }

    // Walk backwards from today (or yesterday, if today is not yet earned).
    let cursor = qualified.has(today) ? today : addDaysISO(today, -1);
    let current = 0;
    while (qualified.has(cursor)) {
      current += 1;
      cursor = addDaysISO(cursor, -1);
    }

    // Longest run anywhere in history.
    const sorted = [...qualified].sort();
    let best = 0;
    let run = 0;
    let prev: ISODate | null = null;
    for (const d of sorted) {
      run = prev !== null && diffDaysISO(d, prev) === 1 ? run + 1 : 1;
      prev = d;
      if (run > best) best = run;
    }

    streak.current = current;
    streak.best = Math.max(best, streak.best, current);
    streak.totalDays = qualified.size;
    streak.lastQualifiedDate = sorted.length ? (sorted[sorted.length - 1] ?? null) : null;
  }
}

/** Every date that could plausibly qualify, from first activity to today. */
function collectHistoryDates(data: AppData, today: ISODate): ISODate[] {
  const set = new Set<ISODate>();
  for (const l of data.dailyLogs) set.add(l.date);
  for (const s of data.studySessions) set.add(s.date);
  for (const t of data.tasks) set.add(t.date);
  for (const p of data.pomodoroLog) set.add(p.date);
  for (const key of Object.keys(data.streaks.streaks) as StreakKey[]) {
    for (const f of data.streaks.streaks[key].freezesUsed) set.add(f.date);
  }
  set.add(today);
  return [...set].filter((d) => d <= today).sort();
}

export function freezesRemainingThisWeek(data: AppData, key: StreakKey, today: ISODate = todayISO()): number {
  const allowed = data.settings.streakFreezesPerWeek;
  const used = data.streaks.streaks[key].freezesUsed.filter((f) =>
    isSameISOWeek(f.date, today, data.settings.weekStartsOn),
  ).length;
  return Math.max(0, allowed - used);
}

export type FreezeResult = { ok: true } | { ok: false; reason: string };

export function applyStreakFreeze(data: AppData, key: StreakKey, date: ISODate, today: ISODate = todayISO()): FreezeResult {
  if (date > today) return { ok: false, reason: 'You can only freeze a day that has already passed.' };
  const streak = data.streaks.streaks[key];
  if (streak.freezesUsed.some((f) => f.date === date)) {
    return { ok: false, reason: 'That day is already frozen.' };
  }
  const m = computeDayMetrics(data, date);
  if (ruleFor(key).qualifies(data, m)) {
    return { ok: false, reason: 'That day already counts — no freeze needed.' };
  }
  if (freezesRemainingThisWeek(data, key, today) <= 0) {
    return { ok: false, reason: 'No streak freezes left this week.' };
  }
  streak.freezesUsed.push({ date });
  recomputeStreaks(data, today);
  return { ok: true };
}

export function removeStreakFreeze(data: AppData, key: StreakKey, date: ISODate, today: ISODate = todayISO()): void {
  const streak = data.streaks.streaks[key];
  streak.freezesUsed = streak.freezesUsed.filter((f) => f.date !== date);
  recomputeStreaks(data, today);
}
