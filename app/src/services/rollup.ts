import type { AppData, ISODate } from '@/types';
import { emptyDailyLog } from '@/data/defaults';
import { buildIndex, computeDayMetrics, computeRangeMetrics, productivityScore } from './metrics';
import { recomputeStreaks } from './streaks';
import { evaluateAchievements, type UnlockedAchievement } from './achievements';
import { awardXP, levelFromXP, pruneXPEntries, revokeXP, XP_RULES } from './xp';
import { endOfWeekISO, startOfWeekISO, todayISO } from '@/utils/date';
import { clamp, sum } from '@/utils/misc';

export interface RollupResult {
  xpGained: number;
  leveledUpTo: number | null;
  unlocked: UnlockedAchievement[];
  score: number;
}

export function ensureLog(data: AppData, date: ISODate) {
  let log = data.dailyLogs.find((l) => l.date === date);
  if (!log) {
    log = emptyDailyLog(date);
    data.dailyLogs.push(log);
    data.dailyLogs.sort((a, b) => a.date.localeCompare(b.date));
  }
  return log;
}

/**
 * Single pass run after every mutation. Order matters:
 *   1. daily milestone XP (needs current metrics)
 *   2. streaks (needs final day qualification)
 *   3. goals (may complete and award XP)
 *   4. achievements (read streaks + level)
 *   5. cache the day's score
 *
 * Every award goes through the XP ledger, so running this repeatedly is safe.
 */
export function runRollup(data: AppData, date: ISODate = todayISO()): RollupResult {
  const levelBefore = levelFromXP(data.xp.total).level;
  const xpBefore = data.xp.total;

  ensureLog(data, date);

  // XP awards mutate the ledger, so the index is rebuilt after that step.
  awardDailyMilestones(data, date);

  const index = buildIndex(data);
  recomputeStreaks(data, date, index);
  syncGoals(data, date);
  const unlocked = evaluateAchievements(data, date, index);

  const metrics = computeDayMetrics(data, date, index);
  const score = productivityScore(data, metrics, index).total;
  const log = ensureLog(data, date);
  log.score = metrics.hasAnyActivity ? score : null;
  // Keep the cached per-day XP honest even after edits.
  log.xpEarned = data.xp.entries.reduce((a, e) => (e.date === date ? a + e.amount : a), 0);

  pruneXPEntries(data);
  data.lastUpdated = new Date().toISOString();

  const levelAfter = levelFromXP(data.xp.total).level;
  return {
    xpGained: data.xp.total - xpBefore,
    leveledUpTo: levelAfter > levelBefore ? levelAfter : null,
    unlocked,
    score,
  };
}

function awardDailyMilestones(data: AppData, date: ISODate): void {
  const m = computeDayMetrics(data, date);
  const t = data.settings.targets;

  const studyKey = `daily_study_goal:${date}`;
  if (t.study > 0 && m.studyMinutes >= t.study) {
    awardXP(data, {
      source: 'daily_study_goal',
      refKey: studyKey,
      amount: XP_RULES.dailyStudyGoal,
      label: 'Daily study goal',
      date,
    });
  } else if (t.study > 0 && m.studyMinutes < t.study && data.xp.awarded[studyKey]) {
    revokeXP(data, {
      source: 'daily_study_goal',
      refKey: studyKey,
      amount: XP_RULES.dailyStudyGoal,
      label: 'Daily study goal revoked',
      date,
    });
  }

  const codingKey = `daily_coding_goal:${date}`;
  if (t.coding > 0 && m.codingMinutes >= t.coding) {
    awardXP(data, {
      source: 'daily_coding_goal',
      refKey: codingKey,
      amount: XP_RULES.dailyCodingGoal,
      label: 'Daily coding goal',
      date,
    });
  } else if (t.coding > 0 && m.codingMinutes < t.coding && data.xp.awarded[codingKey]) {
    revokeXP(data, {
      source: 'daily_coding_goal',
      refKey: codingKey,
      amount: XP_RULES.dailyCodingGoal,
      label: 'Daily coding goal revoked',
      date,
    });
  }

  const exerciseKey = `exercise:${date}`;
  if (t.exercise > 0 && m.exerciseMinutes >= t.exercise) {
    awardXP(data, {
      source: 'exercise',
      refKey: exerciseKey,
      amount: XP_RULES.exercise,
      label: 'Exercise done',
      date,
    });
  } else if (t.exercise > 0 && m.exerciseMinutes < t.exercise && data.xp.awarded[exerciseKey]) {
    revokeXP(data, {
      source: 'exercise',
      refKey: exerciseKey,
      amount: XP_RULES.exercise,
      label: 'Exercise revoked',
      date,
    });
  }

  // "All planned tasks done" needs a real plan — at least two tasks — so a
  // single trivial task can't mint the bonus every day.
  const allTasksKey = `all_tasks_done:${date}`;
  if (m.tasksTotal >= 2 && m.tasksCompleted === m.tasksTotal) {
    awardXP(data, {
      source: 'all_tasks_done',
      refKey: allTasksKey,
      amount: XP_RULES.allTasksDone,
      label: 'Cleared the whole plan',
      date,
    });
  } else if ((m.tasksTotal < 2 || m.tasksCompleted < m.tasksTotal) && data.xp.awarded[allTasksKey]) {
    revokeXP(data, {
      source: 'all_tasks_done',
      refKey: allTasksKey,
      amount: XP_RULES.allTasksDone,
      label: 'Cleared plan bonus revoked',
      date,
    });
  }

  const log = data.dailyLogs.find((l) => l.date === date);
  if (log?.reviewedAt) {
    awardXP(data, {
      source: 'daily_review',
      refKey: `daily_review:${date}`,
      amount: XP_RULES.dailyReview,
      label: 'Daily review written',
      date,
    });
  }

  // Weekly study goal: 7x the daily target across the week.
  const weekStart = startOfWeekISO(date, data.settings.weekStartsOn);
  const weekEnd = endOfWeekISO(date, data.settings.weekStartsOn);
  const weeklyStudyKey = `weekly_study_goal:${weekStart}`;
  if (t.study > 0) {
    const week = computeRangeMetrics(data, weekStart, weekEnd);
    if (week.studyMinutes >= t.study * 7) {
      awardXP(data, {
        source: 'weekly_goal',
        refKey: weeklyStudyKey,
        amount: XP_RULES.weeklyGoal,
        label: 'Weekly study goal',
        date,
      });
    } else if (data.xp.awarded[weeklyStudyKey]) {
      revokeXP(data, {
        source: 'weekly_goal',
        refKey: weeklyStudyKey,
        amount: XP_RULES.weeklyGoal,
        label: 'Weekly study goal revoked',
        date,
      });
    }
  }
}

/** Recomputes `current` for automatic goals and completes those that hit target. */
export function syncGoals(data: AppData, date: ISODate = todayISO()): void {
  for (const goal of data.goals) {
    if (goal.auto) {
      goal.current = measureGoal(data, goal.auto);
    }
    if (goal.status === 'active' && goal.target > 0 && goal.current >= goal.target) {
      goal.status = 'completed';
      goal.completedAt = new Date().toISOString();
    }
    if (goal.status === 'completed' && !goal.xpAwarded) {
      const granted = awardXP(data, {
        source: 'goal_completed',
        refKey: `goal:${goal.id}`,
        amount: XP_RULES.goalCompleted,
        label: `Goal: ${goal.title}`,
        date,
      });
      if (granted > 0 || data.xp.awarded[`goal:${goal.id}`] !== undefined) goal.xpAwarded = true;
    }
    if (goal.auto && goal.status === 'completed' && goal.target > 0 && goal.current < goal.target) {
      goal.status = 'active';
      goal.completedAt = null;
      if (goal.xpAwarded || data.xp.awarded[`goal:${goal.id}`] !== undefined) {
        revokeXP(data, {
          source: 'goal_completed',
          refKey: `goal:${goal.id}`,
          amount: XP_RULES.goalCompleted,
          label: `Goal: ${goal.title} (reopened)`,
          date,
        });
        goal.xpAwarded = false;
      }
    }
    if (
      goal.status === 'active' &&
      goal.deadline !== null &&
      goal.deadline < date &&
      goal.current < goal.target
    ) {
      goal.status = 'failed';
    }
  }
}

function measureGoal(data: AppData, auto: NonNullable<AppData['goals'][number]['auto']>): number {
  const { from, to, metric, subjectId } = auto;
  const inRange = <T extends { date: ISODate }>(items: T[]) =>
    items.filter((i) => i.date >= from && i.date <= to);

  switch (metric) {
    case 'study_minutes': {
      const sessions = inRange(data.studySessions).filter(
        (s) => s.method !== 'coding' && (!subjectId || s.subjectId === subjectId),
      );
      const manual = subjectId ? 0 : sum(inRange(data.dailyLogs).map((l) => l.minutes.study));
      return sum(sessions.map((s) => s.minutes)) + manual;
    }
    case 'coding_minutes': {
      const sessions = inRange(data.studySessions).filter((s) => s.method === 'coding');
      return sum(sessions.map((s) => s.minutes)) + sum(inRange(data.dailyLogs).map((l) => l.minutes.coding));
    }
    case 'tasks_completed':
      return inRange(data.tasks).filter((t) => t.status === 'completed').length;
    case 'sessions':
      return inRange(data.studySessions).filter((s) => !subjectId || s.subjectId === subjectId).length;
    case 'streak_days':
      return data.streaks.streaks.study.current;
    case 'topics_done': {
      const subjects = subjectId ? data.subjects.filter((s) => s.id === subjectId) : data.subjects;
      return sum(subjects.map((s) => s.topics.filter((t) => t.done).length));
    }
    default:
      return 0;
  }
}

/** Goal progress as 0..1 for progress bars. */
export function goalProgress(goal: AppData['goals'][number]): number {
  return goal.target > 0 ? clamp(goal.current / goal.target, 0, 1) : 0;
}
