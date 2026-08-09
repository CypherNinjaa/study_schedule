import { useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useData, useDayMetrics, useIndex, useScore } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
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

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader
              title="Timeline"
              subtitle="Classes come from your timetable; time-blocked tasks sit alongside them"
            />
            <DayTimeline date={activeDate} />
          </Card>

          <Card>
            <CardHeader
              title="Tasks"
              subtitle={
                tasks.length === 0 ? 'Nothing planned' : `${day.tasksCompleted} of ${tasks.length} done`
              }
              action={
                open.length > 0 ? <span className="chip">{open.length} open</span> : undefined
              }
            />
            <div className="p-2">
              {tasks.length === 0 ? (
                <EmptyState
                  icon={<Sparkles size={20} />}
                  title="No tasks for this day"
                  message="Plan two or three meaningful things rather than a long list."
                  action={
                    <button
                      type="button"
                      className="btn-primary btn-sm gap-1.5"
                      onClick={() => openQuickAdd(activeDate)}
                    >
                      <Plus size={15} /> Add a task
                    </button>
                  }
                />
              ) : (
                <div className="space-y-0.5">
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Habits" subtitle={`${day.habitsDone} of ${day.habitsDue} due today`} />
            <div className="p-3">
              <HabitStrip date={activeDate} />
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader
              title={`Score ${score.total}`}
              subtitle={`${score.label} · every component is shown, nothing hidden`}
            />
            <ul className="divide-y divide-line">
              {score.components.map((c) => (
                <li key={c.key} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink">{c.label}</span>
                    <span
                      className={cn(
                        'text-xs tabular',
                        c.points < 0 ? 'text-danger' : c.max > 0 && c.points >= c.max * 0.9 ? 'text-ok' : 'text-muted',
                      )}
                    >
                      {c.points > 0 ? '+' : ''}
                      {c.points}
                      {c.max > 0 && ` / ${c.max}`}
                    </span>
                  </div>
                  {c.max > 0 && (
                    <ProgressBar
                      className="mt-1.5"
                      value={c.points / c.max}
                      tone={c.points >= c.max * 0.9 ? 'ok' : 'accent'}
                      label={`${c.label} score`}
                    />
                  )}
                  <p className="mt-1 text-[11px] text-muted">{c.detail}</p>
                </li>
              ))}
            </ul>
          </Card>

          <TimeAllocationEditor date={activeDate} />
          <DailyReview date={activeDate} />
        </div>
      </div>

      {data.schedule.holidays.includes(activeDate) && (
        <p className="text-center text-xs text-muted">This day is marked as a holiday, so no classes are counted.</p>
      )}
    </div>
  );
}
