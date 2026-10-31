import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  PictureInPicture2,
  Plus,
  Timer,
} from 'lucide-react';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { cn } from '@/utils/misc';
import { daysUntil } from '@/utils/time';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useData, useDayMetrics, useIndex, useRangeMetrics, useScore } from '@/hooks/useMetrics';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { TaskRow } from '@/components/tasks/TaskRow';
import { HabitStrip } from '@/components/habits/HabitStrip';
import { InsightList } from '@/components/insights/InsightList';
import { StreakCards } from '@/components/gamification/StreakCards';
import { levelFromXP } from '@/services/xp';
import { habitsDueOn, timeAllocation } from '@/services/metrics';
import {
  addDaysISO,
  diffDaysISO,
  formatDateLong,
  formatHHMM12,
  formatMinutes,
  hhmmToMinutes,
  nowHHMM,
  startOfWeekISO,
  todayISO,
  weekdayOf,
} from '@/utils/date';

export function Dashboard() {
  const data = useData();
  const index = useIndex();
  const today = todayISO();
  const navigate = useUiStore((s) => s.navigate);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const setReviewOpen = useUiStore((s) => s.setReviewOpen);
  const setActiveDate = useDataStore((s) => s.setActiveDate);

  const day = useDayMetrics(today);
  const score = useScore(today);
  const week = useRangeMetrics(addDaysISO(today, -6), today);
  const level = useMemo(() => levelFromXP(data.xp.total), [data.xp.total]);
  const targets = data.settings.targets;

  const todaysTasks = useMemo(
    () =>
      (index.tasks.get(today) ?? [])
        .slice()
        .sort((a, b) => (a.start ?? '99:99').localeCompare(b.start ?? '99:99') || a.order - b.order),
    [index, today],
  );
  const openTasks = todaysTasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');

  const nextClass = useMemo(() => {
    const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
    if (!sem || data.schedule.holidays.includes(today)) return null;
    const now = hhmmToMinutes(nowHHMM());
    const dow = weekdayOf(today);
    return (
      sem.slots
        .filter((s) => s.day === dow && hhmmToMinutes(s.end) > now)
        .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
    );
  }, [data.schedule, today]);

  const alloc = useMemo(() => timeAllocation(day), [day]);
  const habitsDue = habitsDueOn(data.habits, today);

  const upcomingExams = useMemo(
    () =>
      (data.exams || [])
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data.exams, today],
  );
  const nextExam = upcomingExams[0] ?? null;
  const daysToExam = nextExam ? daysUntil(nextExam.date, today) : null;

  // Nudge a weekly review in the first two days of a new week. Dismissible for the session.
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const lastWeek = useRangeMetrics(
    addDaysISO(startOfWeekISO(today, data.settings.weekStartsOn), -7),
    addDaysISO(startOfWeekISO(today, data.settings.weekStartsOn), -1),
  );
  const daysIntoWeek = diffDaysISO(today, startOfWeekISO(today, data.settings.weekStartsOn));
  const showReviewBanner = !reviewDismissed && daysIntoWeek <= 1 && lastWeek.activeDays > 0;

  const studyProgress = Math.min(100, Math.round((day.studyMinutes / (targets.study || 1)) * 100));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-serif font-medium tracking-tight text-ink md:text-3xl">
            {formatDateLong(today)}
          </h1>
          <p className="mt-1 text-sm text-muted tabular">
            {score.label} so far · {formatMinutes(day.studyMinutes)} studied · {day.tasksCompleted} of{' '}
            {day.tasksTotal} tasks done
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="btn-outline btn-sm gap-1.5"
            onClick={() => usePomodoroStore.getState().requestPipToggle()}
            title="Open Picture-in-Picture Focus Timer"
          >
            <PictureInPicture2 size={14} className="text-muted" />
            <span className="hidden sm:inline">PiP timer</span>
          </button>
          <button
            type="button"
            className="btn-outline btn-sm gap-1.5"
            onClick={() => openQuickAdd(today)}
          >
            <Plus size={14} className="text-muted" />
            <span>Add task</span>
          </button>
          <button
            type="button"
            className="btn-sm inline-flex items-center gap-1.5 rounded-ctl bg-[#eceae5] px-3.5 py-1.5 font-medium text-[#151618] hover:bg-white active:bg-[#dedcd6] transition-colors"
            onClick={() => navigate('study')}
          >
            <Timer size={14} className="text-[#151618]" />
            <span>Start focus</span>
          </button>
        </div>
      </header>

      {/* Dismissible weekly review reflection */}
      {showReviewBanner && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-card border border-accent/25 bg-accent-soft px-4 py-3 text-left transition-colors hover:bg-accent-soft/80"
        >
          <CalendarCheck size={16} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Previous week reflection</p>
            <p className="text-xs text-muted tabular">
              {lastWeek.activeDays} active {lastWeek.activeDays === 1 ? 'day' : 'days'},{' '}
              {formatMinutes(lastWeek.studyMinutes)} studied. Review what worked.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-xs font-medium text-accent sm:flex">
            Open review <ArrowRight size={13} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Dismiss weekly review prompt"
            className="btn-icon h-7 w-7 shrink-0 text-muted hover:text-ink"
            onClick={(e) => {
              e.stopPropagation();
              setReviewDismissed(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setReviewDismissed(true);
              }
            }}
          >
            ✕
          </span>
        </button>
      )}

      {/* Main Focus Desk & Academic Ledger */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left 2 cols: Today's Study Target & Session Gauge */}
        <Card className="flex flex-col justify-between p-5 lg:col-span-2">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                <span className="text-xs font-medium text-muted">Study allocation</span>
              </div>
              <span className="text-xs text-muted tabular">
                Target {formatMinutes(targets.study)}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted">Logged today</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tabular text-ink">
                    {formatMinutes(day.studyMinutes)}
                  </span>
                  <span className="text-sm text-muted tabular">
                    / {formatMinutes(targets.study)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted">Goal pace</p>
                <p className="mt-1 text-sm font-medium tabular text-ink">
                  {day.studyMinutes >= targets.study
                    ? 'Target reached'
                    : `${formatMinutes(Math.max(0, targets.study - day.studyMinutes))} remaining`}
                </p>
              </div>
            </div>

            {/* Disciplined progress gauge */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${studyProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Sub-allocation metrics row */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
            <div className="pr-3">
              <p className="text-[11px] font-medium text-muted">Coding</p>
              <p className="mt-0.5 text-base font-semibold tabular text-ink">
                {formatMinutes(day.codingMinutes)}
              </p>
              <p className="text-[11px] text-muted tabular">Target {formatMinutes(targets.coding)}</p>
            </div>
            <div className="px-3">
              <p className="text-[11px] font-medium text-muted">Free time</p>
              <p className="mt-0.5 text-base font-semibold tabular text-ink">
                {formatMinutes(alloc.free)}
              </p>
              <p className="text-[11px] text-muted">Untracked</p>
            </div>
            <div className="pl-3">
              <p className="text-[11px] font-medium text-muted">Week score</p>
              <p className="mt-0.5 text-base font-semibold tabular text-ink">
                {Math.round(week.avgScore)}
              </p>
              <p className="text-[11px] text-muted tabular">
                {week.activeDays} active {week.activeDays === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
        </Card>

        {/* Right 1 col: Academic Standing & XP Ledger */}
        <Card className="flex flex-col justify-between p-5 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3.5">
              <span className="text-xs font-medium text-muted">Academic progress</span>
              <span className="text-xs font-medium tabular text-accent">
                Level {level.level}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-2xl font-semibold tabular text-ink">
                {level.totalXP.toLocaleString()}{' '}
                <span className="text-xs font-normal text-muted">XP total</span>
              </p>
              <p className="mt-0.5 text-xs text-muted tabular">
                {(level.levelSpanXP - level.progressXP).toLocaleString()} XP to Level {level.level + 1}
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{
                    width: `${level.levelSpanXP > 0 ? Math.round((level.progressXP / level.levelSpanXP) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-ctl bg-elevated/70 p-2.5">
                <p className="text-[11px] text-muted">Today's XP</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-ink">+{day.xpEarned}</p>
              </div>
              <div className="rounded-ctl bg-elevated/70 p-2.5">
                <p className="text-[11px] text-muted">This week</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-ink">+{week.xpEarned}</p>
              </div>
              <div className="rounded-ctl bg-elevated/70 p-2.5">
                <p className="text-[11px] text-muted">Daily score</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-ink">
                  {score.total}{' '}
                  <span className="text-[10px] font-normal text-muted">/ 100</span>
                </p>
              </div>
              <div className="rounded-ctl bg-elevated/70 p-2.5">
                <p className="text-[11px] text-muted">Achievements</p>
                <p className="mt-0.5 text-sm font-semibold tabular text-ink">
                  {data.achievements.filter((a) => a.unlockedAt).length}{' '}
                  <span className="text-[10px] font-normal text-muted">
                    of {data.achievements.length}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              onClick={() => {
                setActiveDate(today);
                navigate('today');
              }}
            >
              See score breakdown <ArrowRight size={12} />
            </button>
          </div>
        </Card>
      </div>

      {/* Consistency Ledgers */}
      <StreakCards />

      {/* Daily Itinerary & Habits */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Plan */}
        <Card>
          <CardHeader
            title="Today's plan"
            subtitle={
              openTasks.length === 0
                ? todaysTasks.length > 0
                  ? 'All tasks completed'
                  : 'No tasks scheduled'
                : `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}`
            }
            action={
              <button
                type="button"
                className="btn-ghost btn-sm gap-1"
                onClick={() => navigate('tasks')}
              >
                All tasks <ArrowRight size={13} />
              </button>
            }
          />
          <div className="p-3">
            {todaysTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-muted">
                  <CalendarCheck size={18} />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">No tasks scheduled for today</p>
                <p className="mt-1 max-w-xs text-xs text-muted">
                  Add priorities to structure your study blocks and keep momentum.
                </p>
                <button
                  type="button"
                  className="btn-outline btn-sm mt-4 gap-1.5"
                  onClick={() => openQuickAdd(today)}
                >
                  <Plus size={14} className="text-muted" /> Add task
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {todaysTasks.slice(0, 7).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
                {todaysTasks.length > 7 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm w-full mt-1"
                    onClick={() => navigate('tasks')}
                  >
                    {todaysTasks.length - 7} more tasks
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Classes, Exams & Habits */}
        <div className="space-y-4">
          {nextClass && (
            <Card className="p-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs font-medium text-muted">Next class</span>
                <span className="text-xs text-muted tabular">
                  {formatHHMM12(nextClass.start)}–{formatHHMM12(nextClass.end)}
                </span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-ink">
                {nextClass.title ||
                  data.subjects.find((s) => s.id === nextClass.subjectId)?.name ||
                  'Class'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {nextClass.room && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> Room {nextClass.room}
                  </span>
                )}
                {nextClass.teacher && <span>{nextClass.teacher}</span>}
              </div>
            </Card>
          )}

          {nextExam && (
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-muted">Next exam</span>
                  <p className="mt-1 text-sm font-semibold text-ink">{nextExam.title}</p>
                </div>
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-xs font-semibold tabular border',
                    daysToExam !== null && daysToExam <= 3
                      ? 'border-danger/30 bg-danger/10 text-danger'
                      : daysToExam !== null && daysToExam <= 7
                        ? 'border-warn/30 bg-warn/10 text-warn'
                        : 'border-accent/30 bg-accent/10 text-accent',
                  )}
                >
                  {daysToExam === 0 ? 'Today' : `${daysToExam}d left`}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                <span>{nextExam.venue ? `Venue: ${nextExam.venue}` : nextExam.date}</span>
                <button
                  type="button"
                  className="text-accent hover:underline inline-flex items-center gap-1"
                  onClick={() => navigate('exams')}
                >
                  View exam <ArrowRight size={11} />
                </button>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Daily habits"
              subtitle={
                habitsDue.length > 0
                  ? `${day.habitsDone} of ${habitsDue.length} done`
                  : 'No habits due today'
              }
              action={
                <button
                  type="button"
                  className="btn-ghost btn-sm gap-1"
                  onClick={() => navigate('habits')}
                >
                  Manage <ArrowRight size={13} />
                </button>
              }
            />
            <div className="p-4">
              <HabitStrip date={today} />
            </div>
          </Card>
        </div>
      </div>

      {/* Observations */}
      <InsightList limit={4} />
    </div>
  );
}
