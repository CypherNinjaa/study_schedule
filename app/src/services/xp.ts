import type { AppData, ISODate, XPEntry, XPSource } from '@/types';
import { uid } from '@/utils/misc';

/**
 * Level curve: total XP required to reach level L is
 *   50 * (L-1) * L / 2 * ... tuned so early levels come fast and later ones
 * stretch out. Concretely: level 2 at 100, 3 at 250, 4 at 450, 5 at 700 —
 * matching the roadmap — then continues with the same quadratic growth.
 *
 *   cumulative(L) = 25 * (L-1)^2 + 75 * (L-1)
 */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return 25 * n * n + 75 * n;
}

export interface LevelInfo {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  /** XP into the current level */
  progressXP: number;
  /** XP needed to finish the current level */
  levelSpanXP: number;
  progress: number; // 0..1
  totalXP: number;
}

export function levelFromXP(totalXP: number): LevelInfo {
  const xp = Math.max(0, totalXP);
  // Invert cumulative(L): 25n² + 75n = xp  →  n = (-75 + √(75² + 100·xp)) / 50
  const n = Math.floor((-75 + Math.sqrt(5625 + 100 * xp)) / 50);
  const level = n + 1;
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const levelSpanXP = nextLevelXP - currentLevelXP;
  const progressXP = xp - currentLevelXP;
  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progressXP,
    levelSpanXP,
    progress: levelSpanXP > 0 ? progressXP / levelSpanXP : 0,
    totalXP: xp,
  };
}

/* ------------------------------------------------------------------ */
/* XP awards                                                           */
/* ------------------------------------------------------------------ */

export const XP_RULES = {
  taskBase: 10,
  /** added per difficulty point above 1 (difficulty 5 task = 10 + 4*4 = 26) */
  taskDifficultyStep: 4,
  priorityBonus: { low: 0, medium: 2, high: 5, critical: 8 } as const,
  studySessionBase: 10,
  /** XP per additional 30 min of a study session, capped */
  studySessionPer30Min: 5,
  studySessionCap: 40,
  pomodoro: 15,
  habit: 10,
  dailyStudyGoal: 50,
  dailyCodingGoal: 30,
  allTasksDone: 50,
  exercise: 15,
  weeklyGoal: 100,
  goalCompleted: 75,
  achievement: 40,
  dailyReview: 15,
} as const;

export function taskXP(difficulty: number, priority: keyof typeof XP_RULES.priorityBonus): number {
  const diff = Math.max(1, Math.min(5, difficulty));
  return (
    XP_RULES.taskBase +
    (diff - 1) * XP_RULES.taskDifficultyStep +
    XP_RULES.priorityBonus[priority]
  );
}

export function studySessionXP(minutes: number): number {
  const extra = Math.floor(Math.max(0, minutes - 30) / 30) * XP_RULES.studySessionPer30Min;
  return Math.min(XP_RULES.studySessionCap, XP_RULES.studySessionBase + extra);
}

/**
 * Awards XP for a *state transition*, keyed by a stable `refKey`.
 *
 * The `awarded` ledger records the amount already granted for that key, so:
 *  - completing → un-completing → completing the same task grants XP once;
 *  - re-running a daily rollup is idempotent;
 *  - un-completing does not claw XP back (it stays earned), but re-completing
 *    cannot earn it a second time.
 *
 * Returns the amount actually granted (0 when already awarded).
 */
export function awardXP(
  data: AppData,
  opts: { source: XPSource; refKey: string; amount: number; label: string; date: ISODate },
): number {
  if (opts.amount <= 0) return 0;
  const already = data.xp.awarded[opts.refKey];
  if (already !== undefined) return 0;

  const entry: XPEntry = {
    id: uid('xp'),
    date: opts.date,
    at: new Date().toISOString(),
    source: opts.source,
    refKey: opts.refKey,
    amount: opts.amount,
    label: opts.label,
  };
  data.xp.entries.push(entry);
  data.xp.awarded[opts.refKey] = opts.amount;
  data.xp.total += opts.amount;

  const log = data.dailyLogs.find((l) => l.date === opts.date);
  if (log) log.xpEarned += opts.amount;
  return opts.amount;
}

/**
 * Revokes previously awarded XP for an action, keyed by its stable `refKey`.
 *
 * Removes the key from `awarded` so it can be earned again if the user re-completes the action,
 * subtracts the amount from `data.xp.total` (clamped to 0),
 * adjusts the daily log's `xpEarned`, and logs a deduction entry in `entries`.
 *
 * Returns the amount actually deducted (0 if none had been awarded or invalid).
 */
export function revokeXP(
  data: AppData,
  opts: { source: XPSource; refKey: string; amount?: number; label: string; date: ISODate },
): number {
  const previouslyAwarded = data.xp.awarded[opts.refKey];
  const amountToRevoke = previouslyAwarded !== undefined ? previouslyAwarded : (opts.amount ?? 0);
  if (amountToRevoke <= 0) return 0;

  delete data.xp.awarded[opts.refKey];
  data.xp.total = Math.max(0, data.xp.total - amountToRevoke);

  const entry: XPEntry = {
    id: uid('xp'),
    date: opts.date,
    at: new Date().toISOString(),
    source: opts.source,
    refKey: `revoke:${opts.refKey}`,
    amount: -amountToRevoke,
    label: opts.label,
  };
  data.xp.entries.push(entry);

  const log = data.dailyLogs.find((l) => l.date === opts.date);
  if (log) log.xpEarned = Math.max(0, log.xpEarned - amountToRevoke);

  return amountToRevoke;
}

/**
 * Directly applies an XP penalty deduction (e.g. for bad habits, distraction excess).
 *
 * Subtracts the amount from `data.xp.total` (clamped to 0),
 * adjusts the daily log's `xpEarned`, and appends a penalty entry.
 *
 * Returns the amount deducted.
 */
export function applyPenaltyXP(
  data: AppData,
  opts: { refKey: string; amount: number; label: string; date: ISODate },
): number {
  if (opts.amount <= 0) return 0;
  const penalty = opts.amount;
  data.xp.total = Math.max(0, data.xp.total - penalty);

  const entry: XPEntry = {
    id: uid('xp'),
    date: opts.date,
    at: new Date().toISOString(),
    source: 'penalty',
    refKey: opts.refKey,
    amount: -penalty,
    label: opts.label,
  };
  data.xp.entries.push(entry);

  const log = data.dailyLogs.find((l) => l.date === opts.date);
  if (log) log.xpEarned = Math.max(0, log.xpEarned - penalty);

  return penalty;
}

/** XP earned on a given date, computed from the ledger. */
export function xpOnDate(data: AppData, date: ISODate): number {
  let total = 0;
  for (const e of data.xp.entries) if (e.date === date) total += e.amount;
  return total;
}

export function xpInRange(data: AppData, from: ISODate, to: ISODate): number {
  let total = 0;
  for (const e of data.xp.entries) if (e.date >= from && e.date <= to) total += e.amount;
  return total;
}

/** Keeps the ledger bounded so very long histories stay fast to save/load. */
export function pruneXPEntries(data: AppData, keep = 4000): void {
  if (data.xp.entries.length <= keep) return;
  data.xp.entries = data.xp.entries.slice(-keep);
}
