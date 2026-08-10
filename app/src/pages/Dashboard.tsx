import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Code2,
  Flame,
  MapPin,
  Plus,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useData, useDayMetrics, useIndex, useRangeMetrics, useScore } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar, Ring, StatCard } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { TaskRow } from '@/components/tasks/TaskRow';
import { HabitStrip } from '@/components/habits/HabitStrip';
import { InsightList } from '@/components/insights/InsightList';
import { StreakCards } from '@/components/gamification/StreakCards';
import { levelFromXP } from '@/services/xp';
import { habitsDueOn, timeAllocation } from '@/services/metrics';
import { STREAK_RULES } from '@/services/streaks';
import {
  addDaysISO,
  diffDaysISO,
  formatHHMM12,
  formatMinutes,
  greeting,
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
  const topStreak = useMemo(
    () =>
      STREAK_RULES.map((r) => data.streaks.streaks[r.key]).sort((a, b) => b.current - a.current)[0] ?? null,
    [data.streaks],
  );

  // Nudge a weekly review in the first two days of a new week, once there is a
  // finished week worth reflecting on. Dismissible for the session.
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const lastWeek = useRangeMetrics(addDaysISO(startOfWeekISO(today, data.settings.weekStartsOn), -7), addDaysISO(startOfWeekISO(today, data.settings.weekStartsOn), -1));
  const daysIntoWeek = diffDaysISO(startOfWeekISO(today, data.settings.weekStartsOn), today);
  const showReviewBanner = !reviewDismissed && daysIntoWeek <= 1 && lastWeek.activeDays > 0;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={`${greeting()}, ${data.profile.name}`}
        subtitle={`${score.label} day so far · ${formatMinutes(day.studyMinutes)} studied · ${day.tasksCompleted}/${day.tasksTotal} tasks done`}
        action={
          <>
            <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => navigate('study')}>
              <Timer size={15} /> Start focus
            </button>
            <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd(today)}>
              <Plus size={15} /> New task
            </button>
          </>
        }
      />

      {showReviewBanner && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-panel border border-accent/30 bg-accent-soft px-4 py-3 text-left transition-colors hover:bg-accent-soft/70"
        >
          <CalendarCheck size={18} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">A new week — look back on the last one</p>
            <p className="text-xs text-muted">
              {lastWeek.activeDays} active {lastWeek.activeDays === 1 ? 'day' : 'days'}, {formatMinutes(lastWeek.studyMinutes)} studied. See what worked.
            </p>
          </div>
          <span className="hidden items-center gap-1 text-xs font-medium text-accent sm:flex">
            Open review <ArrowRight size={13} />
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Dismiss weekly review prompt"
            className="btn-icon h-7 w-7 shrink-0"
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

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="flex items-center gap-5 p-5 lg:col-span-1">
          <Ring value={score.total / 100} size={104} tone="var(--accent)">
            <span className="text-2xl font-semibold tabular text-ink">{score.total}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted">score</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{score.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Weighted across study, tasks, habits, coding, sleep, exercise and schedule adherence.
            </p>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              onClick={() => {
                setActiveDate(today);
                navigate('today');
              }}
            >
              See the breakdown <ArrowRight size={13} />
            </button>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Level {level.level}</p>
              <p className="mt-1 text-2xl font-semibold tabular text-ink">
                {level.totalXP.toLocaleString()} <span className="text-sm font-normal text-muted">XP</span>
              </p>
            </div>
            <p className="text-xs text-muted">
              {(level.levelSpanXP - level.progressXP).toLocaleString()} XP to level {level.level + 1}
            </p>
          </div>
          <ProgressBar
            className="mt-3"
            value={level.levelSpanXP > 0 ? level.progressXP / level.levelSpanXP : 0}
            label={`Level ${level.level} progress`}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Today" value={`+${day.xpEarned}`} unit="XP" />
            <MiniStat label="This week" value={`+${week.xpEarned}`} unit="XP" />
            <MiniStat
              label="Best streak"
              value={String(topStreak?.current ?? 0)}
              unit={topStreak?.current === 1 ? 'day' : 'days'}
            />
            <MiniStat
              label="Unlocked"
              value={String(data.achievements.filter((a) => a.unlockedAt).length)}
              unit={`of ${data.achievements.length}`}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen size={17} />}
          label="Study today"
          value={formatMinutes(day.studyMinutes)}
          hint={`Target ${formatMinutes(targets.study)}`}
          tone="var(--c-study)"
          onClick={() => navigate('study')}
        />
        <StatCard
          icon={<Code2 size={17} />}
          label="Coding today"
          value={formatMinutes(day.codingMinutes)}
          hint={`Target ${formatMinutes(targets.coding)}`}
          tone="var(--c-code)"
          onClick={() => navigate('study')}
        />
        <StatCard
          icon={<Flame size={17} />}
          label="Free time left"
          value={formatMinutes(alloc.free)}
          hint="Untracked in the last 24h"
          tone="var(--accent)"
          onClick={() => navigate('analytics')}
        />
        <StatCard
          icon={<Trophy size={17} />}
          label="Week score"
          value={String(Math.round(week.avgScore))}
          hint={`${week.activeDays} active ${week.activeDays === 1 ? 'day' : 'days'}`}
          tone="var(--c-exercise)"
          onClick={() => navigate('analytics')}
        />
      </div>

      <StreakCards />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's plan"
            subtitle={
              openTasks.length === 0
                ? todaysTasks.length > 0
                  ? 'Everything planned is done'
                  : 'Nothing planned yet'
                : `${openTasks.length} open`
            }
            action={
              <button type="button" className="btn-ghost btn-sm gap-1" onClick={() => navigate('tasks')}>
                All tasks <ArrowRight size={14} />
              </button>
            }
          />
          <div className="p-2">
            {todaysTasks.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={20} />}
                title="A clear day"
                message="Add the two or three things that would make today count."
                action={
                  <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd(today)}>
                    <Plus size={15} /> Add a task
                  </button>
                }
              />
            ) : (
              <div className="space-y-0.5">
                {todaysTasks.slice(0, 7).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
                {todaysTasks.length > 7 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm w-full"
                    onClick={() => navigate('tasks')}
                  >
                    {todaysTasks.length - 7} more
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {nextClass && (
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Next class</p>
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {nextClass.title ||
                  data.subjects.find((s) => s.id === nextClass.subjectId)?.name ||
                  'Class'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="tabular">
                  {formatHHMM12(nextClass.start)}–{formatHHMM12(nextClass.end)}
                </span>
                {nextClass.room && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> Room {nextClass.room}
                  </span>
                )}
                {nextClass.teacher && <span>{nextClass.teacher}</span>}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Habits"
              subtitle={habitsDue.length > 0 ? `${day.habitsDone} of ${habitsDue.length} done` : 'None due today'}
              action={
                <button type="button" className="btn-ghost btn-sm gap-1" onClick={() => navigate('habits')}>
                  Manage <ArrowRight size={14} />
                </button>
              }
            />
            <div className="p-3">
              <HabitStrip date={today} />
            </div>
          </Card>
        </div>
      </div>

      <InsightList limit={4} />
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-ctl bg-elevated px-3 py-2">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular text-ink">
        {value} <span className="text-xs font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}
