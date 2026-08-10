import type { AppData, ISODate } from '@/types';
import {
  buildIndex,
  computeRangeMetrics,
  previousWeekRange,
  weekdayAverages,
  type MetricsIndex,
} from '@/services/metrics';
import { addDaysISO, startOfWeekISO, todayISO, weekdayName } from '@/utils/date';

export interface ReviewLine {
  tone: 'positive' | 'neutral' | 'warning';
  text: string;
}

export interface WeeklyReview {
  from: ISODate;
  to: ISODate;
  activeDays: number;
  studyMinutes: number;
  codingMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  sessions: number;
  pomodoros: number;
  xpEarned: number;
  avgScore: number;
  studyTrendPct: number | null;
  scoreTrendPct: number | null;
  wins: ReviewLine[];
  watch: ReviewLine[];
  bestWeekday: string | null;
}

function trend(prev: number, cur: number): number | null {
  if (prev <= 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

/**
 * The §44 weekly review. `today` normally falls in the week being reviewed;
 * pass a date inside last week to review the week just gone. Pure arithmetic
 * over the local document — nothing invented, nothing sent anywhere.
 */
export function computeWeeklyReview(
  data: AppData,
  today: ISODate = todayISO(),
  index: MetricsIndex = buildIndex(data),
): WeeklyReview {
  const from = startOfWeekISO(today, data.settings.weekStartsOn);
  const to = addDaysISO(from, 6);
  const prev = previousWeekRange(from, data.settings.weekStartsOn);

  const cur = computeRangeMetrics(data, from, to, index);
  const before = computeRangeMetrics(data, prev.from, prev.to, index);
  const t = data.settings.targets;

  const wins: ReviewLine[] = [];
  const watch: ReviewLine[] = [];

  const taskRate = cur.tasksTotal > 0 ? cur.tasksCompleted / cur.tasksTotal : null;
  if (taskRate !== null && taskRate >= 0.8 && cur.tasksTotal >= 3) {
    wins.push({ tone: 'positive', text: `Finished ${cur.tasksCompleted} of ${cur.tasksTotal} planned tasks.` });
  } else if (taskRate !== null && taskRate < 0.5 && cur.tasksTotal >= 3) {
    watch.push({
      tone: 'warning',
      text: `Only ${cur.tasksCompleted} of ${cur.tasksTotal} tasks got done — try planning fewer, or smaller.`,
    });
  }

  const weeklyStudyTarget = t.study * 7;
  if (weeklyStudyTarget > 0 && cur.studyMinutes >= weeklyStudyTarget) {
    wins.push({ tone: 'positive', text: `Hit your study target every day's worth — ${hrs(cur.studyMinutes)} in total.` });
  } else if (cur.studyMinutes > 0 && cur.studyMinutes < weeklyStudyTarget * 0.5) {
    watch.push({ tone: 'warning', text: `Study time was light this week at ${hrs(cur.studyMinutes)}.` });
  }

  if (cur.activeDays >= 6) {
    wins.push({ tone: 'positive', text: `Showed up ${cur.activeDays} of 7 days.` });
  } else if (cur.activeDays > 0 && cur.activeDays <= 3) {
    watch.push({ tone: 'warning', text: `Tracked activity on ${cur.activeDays} days — consistency beats intensity.` });
  }

  const byWeekday = weekdayAverages(data, cur.days).filter((w) => w.count >= 1);
  const best = byWeekday.length > 0 ? byWeekday.reduce((a, b) => (b.avgScore > a.avgScore ? b : a)) : null;

  return {
    from,
    to,
    activeDays: cur.activeDays,
    studyMinutes: cur.studyMinutes,
    codingMinutes: cur.codingMinutes,
    tasksCompleted: cur.tasksCompleted,
    tasksTotal: cur.tasksTotal,
    sessions: cur.sessions,
    pomodoros: cur.pomodoros,
    xpEarned: cur.xpEarned,
    avgScore: cur.avgScore,
    studyTrendPct: trend(before.studyMinutes, cur.studyMinutes),
    scoreTrendPct: trend(before.avgScore, cur.avgScore),
    wins,
    watch,
    bestWeekday: best ? weekdayName(best.day) : null,
  };
}

function hrs(min: number): string {
  const h = Math.round((min / 60) * 10) / 10;
  return `${h}h`;
}
