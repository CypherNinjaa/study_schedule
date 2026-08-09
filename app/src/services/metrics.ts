import type { AppData, DailyLog, Habit, ISODate, Subject, TimeAllocation, Weekday } from '@/types';
import { emptyDailyLog } from '@/data/defaults';
import {
  addDaysISO,
  durationBetween,
  endOfWeekISO,
  hhmmToMinutes,
  MINUTES_PER_DAY,
  rangeISO,
  startOfWeekISO,
  weekdayOf,
} from '@/utils/date';
import { clamp, mean, pct, sum } from '@/utils/misc';

/**
 * Study/coding minutes have a single documented rule:
 *   sessions are the primary record, and the daily log's `minutes.study` /
 *   `minutes.coding` fields are *additional* manually-entered time.
 * Pomodoro rounds are stored as study sessions, so they are already counted.
 */

export interface DayMetrics {
  date: ISODate;
  studyMinutes: number;
  codingMinutes: number;
  collegeMinutes: number;
  travelMinutes: number;
  exerciseMinutes: number;
  relationshipMinutes: number;
  socialMediaMinutes: number;
  entertainmentMinutes: number;
  otherMinutes: number;
  sleepMinutes: number | null;
  tasksTotal: number;
  tasksCompleted: number;
  tasksSkipped: number;
  habitsDue: number;
  habitsDone: number;
  sessions: number;
  pomodoros: number;
  xpEarned: number;
  wokeAt: string | null;
  hasAnyActivity: boolean;
}

/**
 * Per-date lookup index. Rollups touch every historical day on each mutation,
 * so grouping records by date once turns an O(days × records) sweep into
 * O(days + records).
 */
export interface MetricsIndex {
  logs: Map<ISODate, DailyLog>;
  sessions: Map<ISODate, AppData['studySessions']>;
  tasks: Map<ISODate, AppData['tasks']>;
  pomodoros: Map<ISODate, number>;
  xp: Map<ISODate, number>;
  collegeByWeekday: Map<Weekday, number>;
}

function pushInto<T>(map: Map<ISODate, T[]>, key: ISODate, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function buildIndex(data: AppData): MetricsIndex {
  const logs = new Map<ISODate, DailyLog>();
  for (const l of data.dailyLogs) logs.set(l.date, l);

  const sessions = new Map<ISODate, AppData['studySessions']>();
  for (const s of data.studySessions) pushInto(sessions, s.date, s);

  const tasks = new Map<ISODate, AppData['tasks']>();
  for (const t of data.tasks) pushInto(tasks, t.date, t);

  const pomodoros = new Map<ISODate, number>();
  for (const p of data.pomodoroLog) {
    if (p.kind === 'focus') pomodoros.set(p.date, (pomodoros.get(p.date) ?? 0) + 1);
  }

  const xp = new Map<ISODate, number>();
  for (const e of data.xp.entries) xp.set(e.date, (xp.get(e.date) ?? 0) + e.amount);

  const collegeByWeekday = new Map<Weekday, number>();
  const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
  if (sem) {
    for (let day = 0 as Weekday; day <= 6; day = (day + 1) as Weekday) {
      const slots = sem.slots.filter((s) => s.day === day);
      if (slots.length === 0) {
        collegeByWeekday.set(day, 0);
        continue;
      }
      const starts = slots.map((s) => hhmmToMinutes(s.start));
      const ends = slots.map((s) => hhmmToMinutes(s.end));
      collegeByWeekday.set(day, Math.max(0, Math.max(...ends) - Math.min(...starts)));
    }
  }

  return { logs, sessions, tasks, pomodoros, xp, collegeByWeekday };
}

export function getLog(data: AppData, date: ISODate, index?: MetricsIndex): DailyLog {
  if (index) return index.logs.get(date) ?? emptyDailyLog(date);
  return data.dailyLogs.find((l) => l.date === date) ?? emptyDailyLog(date);
}

/** Scheduled class minutes for a date, respecting holidays. */
export function collegeMinutesFor(data: AppData, date: ISODate, index?: MetricsIndex): number {
  if (data.schedule.holidays.includes(date)) return 0;
  const day = weekdayOf(date);
  if (index) return index.collegeByWeekday.get(day) ?? 0;
  const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
  if (!sem) return 0;
  const slots = sem.slots.filter((s) => s.day === day);
  if (slots.length === 0) return 0;
  // Span from first class to last class, so gaps between periods count as
  // time spent at college rather than free time.
  const starts = slots.map((s) => hhmmToMinutes(s.start));
  const ends = slots.map((s) => hhmmToMinutes(s.end));
  return Math.max(0, Math.max(...ends) - Math.min(...starts));
}

export function hasClassesOn(data: AppData, date: ISODate): boolean {
  return collegeMinutesFor(data, date) > 0;
}

/** Habits that are expected on a given date. */
export function habitsDueOn(habits: Habit[], date: ISODate): Habit[] {
  const day = weekdayOf(date);
  return habits.filter((h) => {
    if (h.archived) return false;
    if (h.freq === 'daily') return true;
    if (h.freq === 'custom') return (h.daysOfWeek ?? []).includes(day);
    return true; // weekly habits are "due" any day; the target is per-week
  });
}

export function computeDayMetrics(data: AppData, date: ISODate, index?: MetricsIndex): DayMetrics {
  const log = getLog(data, date, index);
  const sessions = index
    ? (index.sessions.get(date) ?? [])
    : data.studySessions.filter((s) => s.date === date);

  const sessionStudy = sum(sessions.filter((s) => s.method !== 'coding').map((s) => s.minutes));
  const sessionCoding = sum(sessions.filter((s) => s.method === 'coding').map((s) => s.minutes));

  const studyMinutes = sessionStudy + log.minutes.study;
  const codingMinutes = sessionCoding + log.minutes.coding;

  const scheduledCollege = collegeMinutesFor(data, date, index);
  const collegeMinutes = log.minutes.college > 0 ? log.minutes.college : scheduledCollege;
  const travelMinutes =
    log.minutes.travel > 0
      ? log.minutes.travel
      : collegeMinutes > 0
        ? data.settings.travelMinutesToCollege + data.settings.travelMinutesFromCollege
        : 0;

  const relationshipMinutes =
    log.minutes.relationship + log.relationshipDayMinutes + log.relationshipNightMinutes;

  const dayTasks = index ? (index.tasks.get(date) ?? []) : data.tasks.filter((t) => t.date === date);
  const habitsDue = habitsDueOn(data.habits, date);
  const pomodoros = index
    ? (index.pomodoros.get(date) ?? 0)
    : data.pomodoroLog.filter((p) => p.date === date && p.kind === 'focus').length;

  let sleepMinutes = log.sleepMinutes;
  if (sleepMinutes === null && log.sleptAt && log.wokeAt) {
    sleepMinutes = durationBetween(log.sleptAt, log.wokeAt);
  }

  const hasAnyActivity =
    studyMinutes > 0 ||
    codingMinutes > 0 ||
    sessions.length > 0 ||
    dayTasks.length > 0 ||
    log.habitsDone.length > 0 ||
    log.note.trim() !== '' ||
    sleepMinutes !== null ||
    log.minutes.exercise > 0;

  return {
    date,
    studyMinutes,
    codingMinutes,
    collegeMinutes,
    travelMinutes,
    exerciseMinutes: log.minutes.exercise,
    relationshipMinutes,
    socialMediaMinutes: log.minutes.socialMedia,
    entertainmentMinutes: log.minutes.entertainment,
    otherMinutes: log.minutes.other,
    sleepMinutes,
    tasksTotal: dayTasks.length,
    tasksCompleted: dayTasks.filter((t) => t.status === 'completed').length,
    tasksSkipped: dayTasks.filter((t) => t.status === 'skipped').length,
    habitsDue: habitsDue.length,
    habitsDone: log.habitsDone.length,
    sessions: sessions.length,
    pomodoros,
    xpEarned: index
      ? (index.xp.get(date) ?? 0)
      : data.xp.entries.reduce((a, e) => (e.date === date ? a + e.amount : a), 0),
    wokeAt: log.wokeAt,
    hasAnyActivity,
  };
}

/** 24-hour allocation for the time-management view. */
export function timeAllocation(m: DayMetrics): TimeAllocation & { sleep: number; free: number } {
  const alloc = {
    study: m.studyMinutes,
    coding: m.codingMinutes,
    college: m.collegeMinutes,
    travel: m.travelMinutes,
    relationship: m.relationshipMinutes,
    exercise: m.exerciseMinutes,
    entertainment: m.entertainmentMinutes,
    socialMedia: m.socialMediaMinutes,
    other: m.otherMinutes,
    sleep: m.sleepMinutes ?? 0,
  };
  const used = sum(Object.values(alloc));
  return { ...alloc, free: Math.max(0, MINUTES_PER_DAY - used) };
}

/* ------------------------------------------------------------------ */
/* Range aggregation                                                   */
/* ------------------------------------------------------------------ */

export interface RangeMetrics {
  from: ISODate;
  to: ISODate;
  days: DayMetrics[];
  studyMinutes: number;
  codingMinutes: number;
  exerciseMinutes: number;
  relationshipMinutes: number;
  socialMediaMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  sessions: number;
  pomodoros: number;
  xpEarned: number;
  avgSleepMinutes: number | null;
  avgScore: number;
  activeDays: number;
}

export function computeRangeMetrics(
  data: AppData,
  from: ISODate,
  to: ISODate,
  index: MetricsIndex = buildIndex(data),
): RangeMetrics {
  const days = rangeISO(from, to).map((d) => computeDayMetrics(data, d, index));
  const sleeps = days.map((d) => d.sleepMinutes).filter((v): v is number => v !== null);
  const scored = days.filter((d) => d.hasAnyActivity).map((d) => productivityScore(data, d, index).total);

  return {
    from,
    to,
    days,
    studyMinutes: sum(days.map((d) => d.studyMinutes)),
    codingMinutes: sum(days.map((d) => d.codingMinutes)),
    exerciseMinutes: sum(days.map((d) => d.exerciseMinutes)),
    relationshipMinutes: sum(days.map((d) => d.relationshipMinutes)),
    socialMediaMinutes: sum(days.map((d) => d.socialMediaMinutes)),
    tasksCompleted: sum(days.map((d) => d.tasksCompleted)),
    tasksTotal: sum(days.map((d) => d.tasksTotal)),
    sessions: sum(days.map((d) => d.sessions)),
    pomodoros: sum(days.map((d) => d.pomodoros)),
    xpEarned: sum(days.map((d) => d.xpEarned)),
    avgSleepMinutes: sleeps.length ? mean(sleeps) : null,
    avgScore: scored.length ? mean(scored) : 0,
    activeDays: days.filter((d) => d.hasAnyActivity).length,
  };
}

/* ------------------------------------------------------------------ */
/* Productivity score                                                  */
/* ------------------------------------------------------------------ */

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface ScoreBreakdown {
  total: number;
  label: string;
  components: ScoreComponent[];
}

/**
 * Weighted 0-100 score. Weights sum to 100 on the positive side; distraction
 * is a penalty of up to -10, and the result is clamped to 0..100.
 *
 *   Study 30 · Tasks 25 · Habits 15 · Coding 10 · Sleep 10 · Exercise 5
 *   · Schedule adherence 5 · Distraction penalty up to -10
 */
export const SCORE_WEIGHTS = {
  study: 30,
  tasks: 25,
  habits: 15,
  coding: 10,
  sleep: 10,
  exercise: 5,
  adherence: 5,
  distractionPenalty: 10,
} as const;

export function productivityScore(data: AppData, m: DayMetrics, index?: MetricsIndex): ScoreBreakdown {
  const t = data.settings.targets;
  const components: ScoreComponent[] = [];

  const studyRatio = t.study > 0 ? clamp(m.studyMinutes / t.study, 0, 1) : m.studyMinutes > 0 ? 1 : 0;
  components.push({
    key: 'study',
    label: 'Study',
    points: round1(studyRatio * SCORE_WEIGHTS.study),
    max: SCORE_WEIGHTS.study,
    detail: `${Math.round(m.studyMinutes)} of ${t.study} min target`,
  });

  const taskRatio = m.tasksTotal > 0 ? m.tasksCompleted / m.tasksTotal : 0;
  components.push({
    key: 'tasks',
    label: 'Tasks',
    points: round1(taskRatio * SCORE_WEIGHTS.tasks),
    max: SCORE_WEIGHTS.tasks,
    detail: m.tasksTotal > 0 ? `${m.tasksCompleted} of ${m.tasksTotal} completed` : 'No tasks planned',
  });

  const habitRatio = m.habitsDue > 0 ? clamp(m.habitsDone / m.habitsDue, 0, 1) : 0;
  components.push({
    key: 'habits',
    label: 'Habits',
    points: round1(habitRatio * SCORE_WEIGHTS.habits),
    max: SCORE_WEIGHTS.habits,
    detail: m.habitsDue > 0 ? `${m.habitsDone} of ${m.habitsDue} done` : 'No habits due',
  });

  const codeRatio = t.coding > 0 ? clamp(m.codingMinutes / t.coding, 0, 1) : m.codingMinutes > 0 ? 1 : 0;
  components.push({
    key: 'coding',
    label: 'Coding',
    points: round1(codeRatio * SCORE_WEIGHTS.coding),
    max: SCORE_WEIGHTS.coding,
    detail: `${Math.round(m.codingMinutes)} of ${t.coding} min target`,
  });

  // Sleep scores on closeness to target rather than raw quantity, so
  // oversleeping doesn't score higher than hitting the target.
  let sleepPoints = 0;
  let sleepDetail = 'Not logged';
  if (m.sleepMinutes !== null && t.sleep > 0) {
    const ratio = m.sleepMinutes / t.sleep;
    const closeness = ratio >= 1 ? clamp(1 - (ratio - 1) * 0.5, 0.5, 1) : clamp(ratio, 0, 1);
    sleepPoints = round1(closeness * SCORE_WEIGHTS.sleep);
    sleepDetail = `${Math.round(m.sleepMinutes)} min vs ${t.sleep} min target`;
  }
  components.push({ key: 'sleep', label: 'Sleep', points: sleepPoints, max: SCORE_WEIGHTS.sleep, detail: sleepDetail });

  const exRatio = t.exercise > 0 ? clamp(m.exerciseMinutes / t.exercise, 0, 1) : m.exerciseMinutes > 0 ? 1 : 0;
  components.push({
    key: 'exercise',
    label: 'Exercise',
    points: round1(exRatio * SCORE_WEIGHTS.exercise),
    max: SCORE_WEIGHTS.exercise,
    detail: `${Math.round(m.exerciseMinutes)} of ${t.exercise} min target`,
  });

  // Schedule adherence: did planned, time-boxed work actually happen?
  const dayTasks = index ? (index.tasks.get(m.date) ?? []) : data.tasks.filter((x) => x.date === m.date);
  const planned = dayTasks.filter((x) => x.start !== null);
  const plannedDone = planned.filter((x) => x.status === 'completed').length;
  const adherence = planned.length > 0 ? plannedDone / planned.length : m.tasksTotal > 0 ? taskRatio : 0;
  components.push({
    key: 'adherence',
    label: 'Schedule',
    points: round1(adherence * SCORE_WEIGHTS.adherence),
    max: SCORE_WEIGHTS.adherence,
    detail: planned.length > 0 ? `${plannedDone} of ${planned.length} time-blocked done` : 'Nothing time-blocked',
  });

  // Distraction penalty kicks in only past the limit.
  let penalty = 0;
  if (t.socialMediaLimit > 0 && m.socialMediaMinutes > t.socialMediaLimit) {
    const over = m.socialMediaMinutes - t.socialMediaLimit;
    penalty = round1(clamp((over / (t.socialMediaLimit * 2)) * SCORE_WEIGHTS.distractionPenalty, 0, SCORE_WEIGHTS.distractionPenalty));
  }
  components.push({
    key: 'distraction',
    label: 'Distraction',
    points: -penalty,
    max: 0,
    detail:
      penalty > 0
        ? `${Math.round(m.socialMediaMinutes)} min, ${Math.round(m.socialMediaMinutes - t.socialMediaLimit)} over limit`
        : `${Math.round(m.socialMediaMinutes)} min, within limit`,
  });

  const total = Math.round(clamp(sum(components.map((c) => c.points)), 0, 100));
  return { total, label: scoreLabel(total), components };
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Decent';
  if (score >= 35) return 'Below par';
  if (score > 0) return 'Rough day';
  return 'No data';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Subject stats                                                       */
/* ------------------------------------------------------------------ */

export interface SubjectStats {
  subject: Subject;
  minutes: number;
  sessions: number;
  topicsDone: number;
  topicsTotal: number;
  topicProgress: number;
  targetProgress: number;
  assignmentsOpen: number;
  lastStudied: ISODate | null;
  avgConcentration: number | null;
}

export function subjectStats(data: AppData, from?: ISODate, to?: ISODate): SubjectStats[] {
  return data.subjects.map((subject) => {
    const sessions = data.studySessions.filter(
      (s) => s.subjectId === subject.id && (!from || s.date >= from) && (!to || s.date <= to),
    );
    const minutes = sum(sessions.map((s) => s.minutes));
    const topicsDone = subject.topics.filter((t) => t.done).length;
    const dates = sessions.map((s) => s.date).sort();
    const conc = sessions.map((s) => s.concentration);
    return {
      subject,
      minutes,
      sessions: sessions.length,
      topicsDone,
      topicsTotal: subject.topics.length,
      topicProgress: pct(topicsDone, subject.topics.length),
      targetProgress: pct(minutes, subject.targetMinutes),
      assignmentsOpen: subject.assignments.filter((a) => !a.done).length,
      lastStudied: dates.length ? (dates[dates.length - 1] ?? null) : null,
      avgConcentration: conc.length ? mean(conc) : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Weekly helpers                                                      */
/* ------------------------------------------------------------------ */

export function weekRange(date: ISODate, weekStartsOn: 0 | 1): { from: ISODate; to: ISODate } {
  return { from: startOfWeekISO(date, weekStartsOn), to: endOfWeekISO(date, weekStartsOn) };
}

export function previousWeekRange(date: ISODate, weekStartsOn: 0 | 1): { from: ISODate; to: ISODate } {
  const start = addDaysISO(startOfWeekISO(date, weekStartsOn), -7);
  return { from: start, to: addDaysISO(start, 6) };
}

/** Weekday averages used by insights ("Wednesday is your most productive day"). */
export function weekdayAverages(data: AppData, days: DayMetrics[]): { day: Weekday; avgScore: number; count: number }[] {
  const buckets = new Map<Weekday, number[]>();
  for (const d of days) {
    if (!d.hasAnyActivity) continue;
    const wd = weekdayOf(d.date);
    const list = buckets.get(wd) ?? [];
    list.push(productivityScore(data, d).total);
    buckets.set(wd, list);
  }
  return [...buckets.entries()]
    .map(([day, scores]) => ({ day, avgScore: mean(scores), count: scores.length }))
    .sort((a, b) => b.avgScore - a.avgScore);
}
