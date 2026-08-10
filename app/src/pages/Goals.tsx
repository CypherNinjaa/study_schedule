import { useMemo, useState } from 'react';
import { CheckCircle2, Flag, Minus, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { Goal, GoalUnit, TaskCategory, TaskPriority } from '@/types';
import { createGoal, deleteGoal, setGoalProgress, updateGoal } from '@/store/actions';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useData } from '@/hooks/useMetrics';
import { Card, PageHeader, ProgressBar, Segmented, StatCard } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { confirmAction } from '@/utils/confirm';
import { Modal } from '@/components/ui/Modal';
import { XP_RULES } from '@/services/xp';
import { addDaysISO, diffDaysISO, formatDateShort, todayISO } from '@/utils/date';
import { cn, pct } from '@/utils/misc';

const UNITS: GoalUnit[] = ['hours', 'minutes', 'tasks', 'sessions', 'days', 'topics', 'custom'];

const AUTO_METRICS: { value: string; label: string; unit: GoalUnit }[] = [
  { value: '', label: 'Track it by hand', unit: 'custom' },
  { value: 'study_minutes', label: 'Study minutes logged', unit: 'minutes' },
  { value: 'coding_minutes', label: 'Coding minutes logged', unit: 'minutes' },
  { value: 'tasks_completed', label: 'Tasks completed', unit: 'tasks' },
  { value: 'sessions', label: 'Study sessions', unit: 'sessions' },
  { value: 'topics_done', label: 'Topics finished', unit: 'topics' },
  { value: 'streak_days', label: 'Streak days', unit: 'days' },
];

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

export function Goals() {
  const data = useData();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const goals = useMemo(
    () =>
      data.goals
        .filter((g) => (filter === 'all' ? true : filter === 'completed' ? g.status === 'completed' : g.status === 'active'))
        .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || a.createdAt.localeCompare(b.createdAt)),
    [data.goals, filter],
  );

  const activeCount = data.goals.filter((g) => g.status === 'active').length;
  const doneCount = data.goals.filter((g) => g.status === 'completed').length;
  const dueSoon = data.goals.filter(
    (g) => g.status === 'active' && g.deadline !== null && diffDaysISO(today, g.deadline) <= 7,
  ).length;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Goals"
        subtitle={`${activeCount} active · ${doneCount} completed`}
        action={
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
            <Plus size={15} /> New goal
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Target size={18} />} label="Active" value={activeCount} hint="In progress right now" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={doneCount} hint={`+${XP_RULES.goalCompleted} XP each`} tone="var(--c-ok)" />
        <StatCard icon={<Flag size={18} />} label="Due this week" value={dueSoon} hint="Deadline within 7 days" tone="var(--c-warn)" />
      </div>

      <Segmented value={filter} onChange={setFilter} options={FILTERS} />

      {goals.length === 0 ? (
        <Card>
          <div className="p-2">
            <EmptyState
              icon={<Target size={20} />}
              title={filter === 'completed' ? 'Nothing completed yet' : 'No goals yet'}
              message="A goal with a number and a deadline is easier to keep than a good intention."
              action={
                <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Add a goal
                </button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} today={today} onEdit={() => setEditing(goal)} />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <GoalDialog
          goal={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function GoalCard({ goal, today, onEdit }: { goal: Goal; today: string; onEdit: () => void }) {
  const progress = pct(goal.current, goal.target);
  const done = goal.status === 'completed';
  const daysLeft = goal.deadline ? diffDaysISO(today, goal.deadline) : null;
  const overdue = !done && daysLeft !== null && daysLeft < 0;

  // For a dated goal, how far along the calendar is compared with the work.
  const pace =
    goal.deadline && !done
      ? (() => {
          const total = diffDaysISO(goal.createdAt.slice(0, 10), goal.deadline);
          const elapsed = diffDaysISO(goal.createdAt.slice(0, 10), today);
          if (total <= 0) return null;
          return Math.round((elapsed / total) * 100);
        })()
      : null;

  return (
    <Card className={cn(done && 'opacity-70')}>
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-medium text-ink', done && 'line-through')}>{goal.title}</p>
          {goal.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{goal.description}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
            <span className="chip">{goal.category}</span>
            {goal.auto && <span className="text-accent">auto-tracked</span>}
            {goal.deadline && (
              <span className={cn('tabular', overdue && 'text-danger')}>
                {overdue
                  ? `${Math.abs(daysLeft!)}d overdue`
                  : daysLeft === 0
                    ? 'Due today'
                    : `${daysLeft}d left · ${formatDateShort(goal.deadline)}`}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn-icon h-7 w-7" aria-label={`Edit ${goal.title}`} onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="btn-icon h-7 w-7 text-danger"
          aria-label={`Delete ${goal.title}`}
          onClick={() =>
            confirmAction({
              title: `Delete "${goal.title}"?`,
              message: 'The goal and its progress will be removed. This cannot be undone.',
              confirmLabel: 'Delete goal',
              danger: true,
              onConfirm: () => deleteGoal(goal.id),
            })
          }
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-baseline justify-between text-xs">
          <span className="tabular text-ink">
            {formatAmount(goal.current, goal.unit)} of {formatAmount(goal.target, goal.unit)}
          </span>
          <span className={cn('tabular', done ? 'text-ok' : 'text-muted')}>{progress}%</span>
        </div>
        <ProgressBar
          className="mt-1.5"
          value={progress / 100}
          tone={done ? 'ok' : overdue ? 'danger' : 'accent'}
          label={`${goal.title} progress`}
        />
        {pace !== null && (
          <p className="mt-1 text-[11px] text-muted">
            {pace > progress + 10
              ? `Behind pace — ${pace}% of the time has gone, ${progress}% of the work.`
              : progress > pace + 10
                ? `Ahead of pace — ${progress}% done with ${pace}% of the time used.`
                : 'On pace.'}
          </p>
        )}

        {!goal.auto && !done && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="btn-outline btn-sm h-8 w-8 p-0"
              aria-label="Decrease progress"
              onClick={() => setGoalProgress(goal.id, goal.current - stepFor(goal.unit))}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              min={0}
              className="input h-8 flex-1 tabular"
              value={goal.current}
              onChange={(e) => setGoalProgress(goal.id, Number(e.target.value) || 0)}
              aria-label={`${goal.title} progress`}
            />
            <button
              type="button"
              className="btn-outline btn-sm h-8 w-8 p-0"
              aria-label="Increase progress"
              onClick={() => setGoalProgress(goal.id, goal.current + stepFor(goal.unit))}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setGoalProgress(goal.id, goal.target)}
            >
              Done
            </button>
          </div>
        )}
        {goal.auto && (
          <p className="mt-2 text-[11px] text-muted">
            Counted automatically from {formatDateShort(goal.auto.from)} to {formatDateShort(goal.auto.to)}.
          </p>
        )}
        {done && goal.completedAt && (
          <p className="mt-2 text-[11px] text-ok">Completed {formatDateShort(goal.completedAt.slice(0, 10))}.</p>
        )}
      </div>
    </Card>
  );
}

function stepFor(unit: GoalUnit): number {
  return unit === 'minutes' ? 15 : 1;
}

function formatAmount(n: number, unit: GoalUnit): string {
  if (unit === 'minutes') return `${Math.round(n)} min`;
  if (unit === 'hours') return `${Math.round(n * 10) / 10} h`;
  return `${Math.round(n)} ${unit === 'custom' ? '' : unit}`.trim();
}

/* ------------------------------------------------------------------ */

function GoalDialog({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const today = todayISO();

  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [target, setTarget] = useState(String(goal?.target ?? 10));
  const [unit, setUnit] = useState<GoalUnit>(goal?.unit ?? 'hours');
  const [category, setCategory] = useState<TaskCategory>(goal?.category ?? 'study');
  const [priority, setPriority] = useState<TaskPriority>(goal?.priority ?? 'medium');
  const [deadline, setDeadline] = useState(goal?.deadline ?? addDaysISO(today, 30));
  const [metric, setMetric] = useState(goal?.auto?.metric ?? '');
  const [subjectId, setSubjectId] = useState(goal?.auto?.subjectId ?? '');
  const [from, setFrom] = useState(goal?.auto?.from ?? today);

  const submit = () => {
    const trimmed = title.trim();
    const targetNum = Number(target);
    if (!trimmed || !Number.isFinite(targetNum) || targetNum <= 0) return;

    const auto = metric
      ? {
          metric: metric as NonNullable<Goal['auto']>['metric'],
          subjectId: subjectId || null,
          from,
          to: deadline || addDaysISO(today, 30),
        }
      : null;

    const payload = {
      title: trimmed,
      description,
      target: targetNum,
      unit,
      category,
      priority,
      deadline: deadline || null,
      auto,
    };

    if (goal) {
      updateGoal(goal.id, payload);
      toast({ kind: 'success', title: 'Goal updated' });
    } else {
      createGoal(payload);
      toast({ kind: 'success', title: 'Goal created', message: `+${XP_RULES.goalCompleted} XP when you finish it` });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {goal ? 'Save changes' : 'Create goal'}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block">
          <span className="label">Goal</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Finish the DBMS syllabus"
            data-autofocus
          />
        </label>

        <label className="block">
          <span className="label">Why it matters</span>
          <textarea
            className="input min-h-[56px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional, but it helps on the days you don't feel like it"
          />
        </label>

        <label className="block">
          <span className="label">How to measure it</span>
          <select
            className="input"
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value);
              const found = AUTO_METRICS.find((m) => m.value === e.target.value);
              if (found && e.target.value) setUnit(found.unit);
            }}
          >
            {AUTO_METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-muted">
            {metric
              ? 'Progress is counted from what you log — nothing to update by hand.'
              : 'You move the number yourself.'}
          </span>
        </label>

        {metric && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Subject (optional)</span>
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Any subject</option>
                {data.subjects
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Counting from</span>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Target</span>
            <input
              type="number"
              min={1}
              className="input tabular"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Unit</span>
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as GoalUnit)} disabled={Boolean(metric)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Deadline</span>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Category</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
              {(['study', 'college', 'coding', 'project', 'assignment', 'exercise', 'personal', 'relationship', 'other'] as TaskCategory[]).map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="label">Priority</span>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Modal>
  );
}
