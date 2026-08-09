import type { AppData, ISODate } from '@/types';
import { ACHIEVEMENT_DEFS, type AchievementStats } from '@/data/achievements';
import { buildIndex, computeDayMetrics, productivityScore, type MetricsIndex } from './metrics';
import { levelFromXP, XP_RULES, awardXP } from './xp';
import { startOfWeekISO, todayISO } from '@/utils/date';
import { clamp, mean, sum } from '@/utils/misc';

export function computeAchievementStats(
  data: AppData,
  today: ISODate = todayISO(),
  index: MetricsIndex = buildIndex(data),
): AchievementStats {
  const dates = new Set<ISODate>();
  for (const l of data.dailyLogs) dates.add(l.date);
  for (const s of data.studySessions) dates.add(s.date);
  for (const t of data.tasks) dates.add(t.date);

  let perfectDays = 0;
  let activeDays = 0;
  const weekScores = new Map<ISODate, number[]>();

  for (const date of dates) {
    if (date > today) continue;
    const m = computeDayMetrics(data, date, index);
    if (!m.hasAnyActivity) continue;
    activeDays += 1;
    const score = productivityScore(data, m, index).total;
    if (score >= 90) perfectDays += 1;
    const wk = startOfWeekISO(date, data.settings.weekStartsOn);
    const list = weekScores.get(wk) ?? [];
    list.push(score);
    weekScores.set(wk, list);
  }

  let perfectWeeks = 0;
  for (const scores of weekScores.values()) {
    if (scores.length >= 7 && mean(scores) >= 85) perfectWeeks += 1;
  }

  const studyMinutes = sum(
    data.studySessions.filter((s) => s.method !== 'coding').map((s) => s.minutes),
  ) + sum(data.dailyLogs.map((l) => l.minutes.study));
  const codingMinutes = sum(
    data.studySessions.filter((s) => s.method === 'coding').map((s) => s.minutes),
  ) + sum(data.dailyLogs.map((l) => l.minutes.coding));

  const s = data.streaks.streaks;
  return {
    totalStudyMinutes: studyMinutes,
    totalCodingMinutes: codingMinutes,
    totalExerciseMinutes: sum(data.dailyLogs.map((l) => l.minutes.exercise)),
    tasksCompleted: data.tasks.filter((t) => t.status === 'completed').length,
    studySessions: data.studySessions.length,
    pomodoros: data.pomodoroLog.filter((p) => p.kind === 'focus').length,
    bestStudyStreak: s.study.best,
    bestEarlyWakeStreak: s.earlyWake.best,
    bestTaskStreak: s.tasks.best,
    bestCodingStreak: s.coding.best,
    bestExerciseStreak: s.exercise.best,
    bestHabitStreak: s.habits.best,
    perfectDays,
    perfectWeeks,
    level: levelFromXP(data.xp.total).level,
    totalXP: data.xp.total,
    daysLogged: activeDays,
    goalsCompleted: data.goals.filter((g) => g.status === 'completed').length,
    topicsCompleted: sum(data.subjects.map((sub) => sub.topics.filter((t) => t.done).length)),
    reviewsWritten: data.dailyLogs.filter((l) => l.reviewedAt !== null).length,
  };
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

/**
 * Refreshes progress for every achievement and unlocks any that reached
 * their target. Returns the ones newly unlocked this pass so the UI can
 * celebrate them. XP for an unlock is awarded once via the XP ledger.
 */
export function evaluateAchievements(
  data: AppData,
  today: ISODate = todayISO(),
  index?: MetricsIndex,
): UnlockedAchievement[] {
  const stats = computeAchievementStats(data, today, index);
  const now = new Date().toISOString();
  const unlocked: UnlockedAchievement[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    const record = data.achievements.find((a) => a.id === def.id);
    if (!record) continue;
    const value = def.metric(stats);
    record.progress = def.target > 0 ? clamp(value / def.target, 0, 1) : 0;

    if (record.unlockedAt === null && value >= def.target) {
      record.unlockedAt = now;
      record.progress = 1;
      unlocked.push({
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        tier: def.tier,
      });
      awardXP(data, {
        source: 'achievement',
        refKey: `achievement:${def.id}`,
        amount: XP_RULES.achievement,
        label: `Achievement: ${def.name}`,
        date: today,
      });
    }
  }

  return unlocked;
}
