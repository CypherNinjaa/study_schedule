import { useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useData, useDayMetrics, useIndex, useScore } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar } from '@/components/ui/Primitives';
import { TaskRow } from '@/components/tasks/TaskRow';
import { HabitStrip } from '@/components/habits/HabitStrip';
import { DayTimeline } from '@/components/planner/DayTimeline';
import { TimeAllocationEditor } from '@/components/planner/TimeAllocationEditor';
import { DailyReview } from '@/components/planner/DailyReview';
import { addDaysISO, formatDateLong, relativeDayLabel, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

export function Today() {
  const data = useData();
  const index = useIndex();
  const activeDate = useDataStore((s) => s.activeDate);
  const setActiveDate = useDataStore((s) => s.setActiveDate);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const day = useDayMetrics(activeDate);
  const score = useScore(activeDate);
  const isToday = activeDate === todayISO();

  const tasks = useMemo(
    () =>
      (index.tasks.get(activeDate) ?? [])
        .slice()
        .sort((a, b) => (a.start ?? '99:99').localeCompare(b.start ?? '99:99') || a.order - b.order),
    [index, activeDate],
  );
  const open = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title={relativeDayLabel(activeDate)}
        subtitle={formatDateLong(activeDate)}
        action={
          <>
            <div className="flex items-center rounded-ctl border border-line bg-surface">
              <button
                type="button"
                className="btn-icon h-8 w-8"
                aria-label="Previous day"
                onClick={() => setActiveDate(addDaysISO(activeDate, -1))}
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={activeDate}
                onChange={(e) => e.target.value && setActiveDate(e.target.value)}
                className="border-0 bg-transparent px-1 text-sm tabular text-ink outline-none"
                aria-label="Pick a date"
              />
              <button
                type="button"
                className="btn-icon h-8 w-8"
                aria-label="Next day"
                onClick={() => setActiveDate(addDaysISO(activeDate, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {!isToday && (
              <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => setActiveDate(todayISO())}>
                <CalendarDays size={15} /> Today
              </button>
            )}
            <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd(activeDate)}>
              <Plus size={15} /> Add
            </button>
          </>
        }
      />

      {/* Row 1: Daily Schedule & Productivity Score */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex h-full flex-col">
          <DayTimeline date={activeDate} />
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader
            title={`Score ${score.total}`}
            subtitle={`${score.label} · daily productivity breakdown`}
            action={
              <span
                className={cn(
                  'chip tabular text-[11px] font-semibold',
                  score.total >= 80 ? 'border-ok/30 text-ok' : score.total >= 50 ? 'border-accent/30 text-accent' : 'border-warn/30 text-warn',
                )}
              >
                {score.total}/100
              </span>
            }
          />
          <div className="grid flex-1 grid-cols-2 gap-2 p-3">
            {score.components.map((c) => (
              <div key={c.key} className="flex flex-col justify-between rounded-md border border-line/60 bg-surface/50 p-2.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium text-ink">{c.label}</span>
                    <span
                      className={cn(
                        'tabular text-[11px] font-semibold',
                        c.points < 0 ? 'text-danger' : c.max > 0 && c.points >= c.max * 0.9 ? 'text-ok' : 'text-muted',
                      )}
                    >
                      {c.points > 0 ? '+' : ''}
                      {c.points}
                      {c.max > 0 && `/${c.max}`}
                    </span>
                  </div>
                  {c.max > 0 && (
                    <ProgressBar
                      className="mt-1.5 h-1"
                      value={c.points / c.max}
                      tone={c.points >= c.max * 0.9 ? 'ok' : 'accent'}
                      label={`${c.label} score`}
                    />
                  )}
                </div>
                <p className="mt-1.5 truncate text-[10px] text-muted" title={c.detail}>
                  {c.detail}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Daily Execution — Tasks & Habits to check off */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex h-full flex-col">
          <CardHeader
            title="Tasks"
            subtitle={
              tasks.length === 0 ? 'Nothing planned' : `${day.tasksCompleted} of ${tasks.length} done`
            }
            action={
              <div className="flex items-center gap-1.5">
                {open.length > 0 && <span className="chip px-1.5 py-0 text-[10px]">{open.length} open</span>}
                <button
                  type="button"
                  className="btn-ghost btn-sm h-6 gap-1 px-2 text-xs text-accent hover:text-accent"
                  onClick={() => openQuickAdd(activeDate)}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            }
          />
          <div className="flex flex-1 flex-col justify-center p-3">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted">
                  <CalendarDays size={16} />
                </span>
                <p className="mt-2 text-xs font-medium text-ink">No tasks planned for today</p>
                <p className="mt-0.5 max-w-xs text-[11px] text-muted">
                  Plan two or three meaningful priorities rather than a long list.
                </p>
                <button
                  type="button"
                  className="btn-outline btn-sm mt-3 gap-1.5 text-xs"
                  onClick={() => openQuickAdd(activeDate)}
                >
                  <Plus size={13} className="text-muted" /> Add task
                </button>
              </div>
            ) : (
              <div className="max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex h-full flex-col justify-between">
          <CardHeader
            title="Daily habits"
            subtitle={day.habitsDue > 0 ? `${day.habitsDone} of ${day.habitsDue} due today` : 'No habits due today'}
          />
          <div className="flex flex-1 flex-col justify-between p-3.5">
            <HabitStrip date={activeDate} />
            {day.habitsDue > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line/60">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-300"
                      style={{
                        width: `${Math.round((day.habitsDone / day.habitsDue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="tabular font-medium text-ink">
                    {Math.round((day.habitsDone / day.habitsDue) * 100)}% done
                  </span>
                </div>
                <span className="text-[11px] text-muted">
                  {day.habitsDue - day.habitsDone > 0
                    ? `${day.habitsDue - day.habitsDone} remaining today`
                    : 'All habits completed!'}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: 24-Hour Time Accounting & Evening Reflection */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1.3fr_1fr]">
        <TimeAllocationEditor date={activeDate} className="h-full" />
        <DailyReview date={activeDate} className="h-full" />
      </div>

      {data.schedule.holidays.includes(activeDate) && (
        <p className="text-center text-xs text-muted">This day is marked as a holiday, so no classes are counted.</p>
      )}
    </div>
  );
}
