import type { AppData, ISODate } from '@/types';
import { addDaysISO, formatMinutes, todayISO, weekdayName } from '@/utils/date';
import { mean, sum, trendPct } from '@/utils/misc';
import {
  buildIndex,
  computeDayMetrics,
  computeRangeMetrics,
  habitsDueOn,
  previousWeekRange,
  subjectStats,
  weekRange,
  weekdayAverages,
  type MetricsIndex,
} from './metrics';

export type InsightTone = 'positive' | 'neutral' | 'warning';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: string;
  title: string;
  detail: string;
}

/**
 * Rule-based insights — no model, no network. Every statement is derived
 * arithmetic over the local document, so it can always be traced back to data
 * the user can see. Framed as productivity feedback, never health advice.
 */
export function computeInsights(
  data: AppData,
  today: ISODate = todayISO(),
  index: MetricsIndex = buildIndex(data),
): Insight[] {
  const out: Insight[] = [];
  const t = data.settings.targets;
  const { from, to } = weekRange(today, data.settings.weekStartsOn);
  const prev = previousWeekRange(today, data.settings.weekStartsOn);
  const thisWeek = computeRangeMetrics(data, from, to, index);
  const lastWeek = computeRangeMetrics(data, prev.from, prev.to, index);
  const last30 = computeRangeMetrics(data, addDaysISO(today, -29), today, index);
  const day = computeDayMetrics(data, today, index);

  /* --- Study volume trend ---------------------------------------------- */
  const studyTrend = trendPct(lastWeek.studyMinutes, thisWeek.studyMinutes);
  if (lastWeek.studyMinutes > 0 && studyTrend !== null && Math.abs(studyTrend) >= 10) {
    const up = studyTrend > 0;
    out.push({
      id: 'study_trend',
      tone: up ? 'positive' : 'warning',
      icon: up ? 'TrendingUp' : 'TrendingDown',
      title: `Study time is ${up ? 'up' : 'down'} ${Math.abs(Math.round(studyTrend))}% this week`,
      detail: `${formatMinutes(thisWeek.studyMinutes)} so far, against ${formatMinutes(lastWeek.studyMinutes)} last week.`,
    });
  }

  /* --- Best and worst weekday ------------------------------------------ */
  const byWeekday = weekdayAverages(data, last30.days).filter((w) => w.count >= 2);
  if (byWeekday.length >= 3) {
    const best = byWeekday.reduce((a, b) => (b.avgScore > a.avgScore ? b : a));
    const worst = byWeekday.reduce((a, b) => (b.avgScore < a.avgScore ? b : a));
    if (best.avgScore - worst.avgScore >= 12) {
      out.push({
        id: 'weekday_pattern',
        tone: 'neutral',
        icon: 'CalendarRange',
        title: `${weekdayName(best.day)}s are your strongest day`,
        detail: `Average score ${Math.round(best.avgScore)} on ${weekdayName(best.day)}s versus ${Math.round(
          worst.avgScore,
        )} on ${weekdayName(worst.day)}s. Consider moving heavy work off ${weekdayName(worst.day)}.`,
      });
    }
  }

  /* --- Neglected subjects ---------------------------------------------- */
  const subjects = subjectStats(data, addDaysISO(today, -13), today);
  const neglected = subjects.filter((s) => s.minutes === 0 && !s.subject.archived);
  if (subjects.length > 0 && neglected.length > 0) {
    out.push({
      id: 'neglected_subjects',
      tone: 'warning',
      icon: 'BookOpen',
      title:
        neglected.length === 1
          ? `${neglected[0].subject.code} has had no study time in 2 weeks`
          : `${neglected.length} subjects have had no study time in 2 weeks`,
      detail:
        neglected.map((s) => s.subject.code).join(', ') + '. A short session is enough to restart momentum.',
    });
  }

  /* --- Exam proximity -------------------------------------------------- */
  const upcomingExams = data.subjects
    .filter((s) => s.examDate !== null && s.examDate >= today)
    .sort((a, b) => (a.examDate ?? '').localeCompare(b.examDate ?? ''))
    .slice(0, 1);
  for (const subj of upcomingExams) {
    const days = Math.round(
      (new Date(`${subj.examDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
    );
    if (days <= 21) {
      const stat = subjects.find((s) => s.subject.id === subj.id);
      out.push({
        id: `exam_${subj.id}`,
        tone: days <= 7 ? 'warning' : 'neutral',
        icon: 'GraduationCap',
        title: `${subj.code} exam in ${days} ${days === 1 ? 'day' : 'days'}`,
        detail: `${stat ? formatMinutes(stat.minutes) : '0m'} studied in the last two weeks. ${
          stat && stat.topicsDone < stat.topicsTotal
            ? `${stat.topicsTotal - stat.topicsDone} topics still open.`
            : 'Syllabus looks covered.'
        }`,
      });
    }
  }

  /* --- Distraction ----------------------------------------------------- */
  const socialDays = last30.days.filter((d) => d.socialMediaMinutes > 0);
  if (socialDays.length >= 3 && t.socialMediaLimit > 0) {
    const avg = mean(socialDays.map((d) => d.socialMediaMinutes));
    if (avg > t.socialMediaLimit) {
      out.push({
        id: 'social_over',
        tone: 'warning',
        icon: 'Smartphone',
        title: `Social media averages ${formatMinutes(Math.round(avg))} a day`,
        detail: `Your own limit is ${formatMinutes(t.socialMediaLimit)}. Reclaiming half of the excess adds about ${formatMinutes(
          Math.round((avg - t.socialMediaLimit) / 2),
        )} of study time a day.`,
      });
    }
  }

  /* --- Sleep consistency (framed as output, not health) ---------------- */
  const sleeps = last30.days.map((d) => d.sleepMinutes).filter((v): v is number => v !== null);
  if (sleeps.length >= 5) {
    const avgSleep = mean(sleeps);
    const shortNights = last30.days.filter((d) => d.sleepMinutes !== null && d.sleepMinutes < t.sleep - 60);
    const scoredShort = shortNights.filter((d) => d.hasAnyActivity);
    if (scoredShort.length >= 3) {
      const shortScores = scoredShort.map((d) => d.tasksTotal > 0 ? (d.tasksCompleted / d.tasksTotal) * 100 : 0);
      const restScores = last30.days
        .filter((d) => d.hasAnyActivity && d.sleepMinutes !== null && d.sleepMinutes >= t.sleep - 60)
        .map((d) => (d.tasksTotal > 0 ? (d.tasksCompleted / d.tasksTotal) * 100 : 0));
      if (restScores.length >= 3 && mean(restScores) - mean(shortScores) >= 10) {
        out.push({
          id: 'sleep_output',
          tone: 'neutral',
          icon: 'Moon',
          title: 'Task completion is lower after short nights',
          detail: `On nights under ${formatMinutes(t.sleep - 60)} you finished ${Math.round(
            mean(shortScores),
          )}% of planned tasks, against ${Math.round(mean(restScores))}% otherwise. Your data, your call.`,
        });
      }
    } else if (Math.abs(avgSleep - t.sleep) > 45) {
      out.push({
        id: 'sleep_gap',
        tone: 'neutral',
        icon: 'Moon',
        title: `Sleep averages ${formatMinutes(Math.round(avgSleep))}`,
        detail: `Your target is ${formatMinutes(t.sleep)}. Adjust the target in Settings if it no longer matches your schedule.`,
      });
    }
  }

  /* --- Free time ------------------------------------------------------- */
  const freeMinutes = last30.days
    .filter((d) => d.hasAnyActivity)
    .map((d) => {
      const used =
        d.studyMinutes +
        d.codingMinutes +
        d.collegeMinutes +
        d.travelMinutes +
        d.exerciseMinutes +
        d.relationshipMinutes +
        d.socialMediaMinutes +
        d.entertainmentMinutes +
        d.otherMinutes +
        (d.sleepMinutes ?? t.sleep);
      return Math.max(0, 1440 - used);
    });
  if (freeMinutes.length >= 5) {
    const avgFree = mean(freeMinutes);
    if (avgFree >= 90) {
      out.push({
        id: 'free_time',
        tone: 'positive',
        icon: 'Clock',
        title: `About ${formatMinutes(Math.round(avgFree))} a day is unaccounted for`,
        detail: 'Untracked time, not necessarily wasted time. Even 30 minutes of it moves a subject forward.',
      });
    }
  }

  /* --- Habit weak spot ------------------------------------------------- */
  const active = data.habits.filter((h) => !h.archived);
  if (active.length > 0) {
    const window = last30.days.slice(-14);
    const rates = active.map((h) => {
      const due = window.filter((d) => habitsDueOn([h], d.date).length > 0);
      const done = due.filter((d) => (index.logs.get(d.date)?.habitsDone ?? []).includes(h.id));
      return { habit: h, due: due.length, done: done.length, rate: due.length ? done.length / due.length : 1 };
    });
    const weakest = rates.filter((r) => r.due >= 4).sort((a, b) => a.rate - b.rate)[0];
    const strongest = rates.filter((r) => r.due >= 4).sort((a, b) => b.rate - a.rate)[0];
    if (weakest && weakest.rate < 0.5) {
      out.push({
        id: 'habit_weak',
        tone: 'warning',
        icon: 'Repeat',
        title: `"${weakest.habit.name}" is slipping`,
        detail: `Done ${weakest.done} of ${weakest.due} times in the last two weeks. Shrinking it until it feels easy usually works better than trying harder.`,
      });
    }
    if (strongest && strongest.rate === 1 && strongest.due >= 7) {
      out.push({
        id: 'habit_strong',
        tone: 'positive',
        icon: 'CheckCheck',
        title: `"${strongest.habit.name}" is fully consistent`,
        detail: `${strongest.due} for ${strongest.due} in the last two weeks. That one is locked in.`,
      });
    }
  }

  /* --- Today's nudges -------------------------------------------------- */
  const overdue = data.tasks.filter((task) => task.date < today && task.status === 'todo').length;
  if (overdue > 0) {
    out.push({
      id: 'overdue',
      tone: 'warning',
      icon: 'AlertCircle',
      title: `${overdue} ${overdue === 1 ? 'task is' : 'tasks are'} overdue`,
      detail: 'Move them to today or drop them — an accurate list is more useful than a complete one.',
    });
  }

  if (day.studyMinutes > 0 && day.studyMinutes < t.study) {
    out.push({
      id: 'today_gap',
      tone: 'neutral',
      icon: 'Target',
      title: `${formatMinutes(t.study - day.studyMinutes)} left to hit today's study target`,
      detail: `${formatMinutes(day.studyMinutes)} logged of ${formatMinutes(t.study)}.`,
    });
  }

  /* --- Streak protection ----------------------------------------------- */
  for (const key of ['study', 'coding'] as const) {
    const streak = data.streaks.streaks[key];
    if (streak.current >= 3 && streak.lastQualifiedDate === addDaysISO(today, -1)) {
      const doneToday = key === 'study' ? day.studyMinutes >= t.study : day.codingMinutes >= t.coding;
      if (!doneToday) {
        out.push({
          id: `streak_${key}`,
          tone: 'warning',
          icon: 'Flame',
          title: `Your ${streak.current}-day ${key} streak needs today`,
          detail: `Hit ${formatMinutes(key === 'study' ? t.study : t.coding)} to keep it alive, or spend a streak freeze.`,
        });
      }
    }
  }

  /* --- Milestone reached ----------------------------------------------- */
  const totalStudy = sum(data.studySessions.map((s) => s.minutes));
  const hoursDone = Math.floor(totalStudy / 60);
  if (hoursDone >= 10 && hoursDone % 25 === 0) {
    out.push({
      id: 'milestone',
      tone: 'positive',
      icon: 'Award',
      title: `${hoursDone} hours of study logged in total`,
      detail: 'All of it recorded on your own machine, nowhere else.',
    });
  }

  return out;
}
