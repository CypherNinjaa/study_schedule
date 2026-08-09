import { useMemo, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Habit, HabitFreq, Weekday } from '@/types';
import { createHabit, deleteHabit, toggleHabit, updateHabit } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar, StatCard } from '@/components/ui/Primitives';
import { EmptyState, confirmAction } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Glyph } from '@/components/ui/Celebrations';
import { Heatmap, type HeatmapCell } from '@/components/charts/Heatmap';
import { habitsDueOn } from '@/services/metrics';
import { XP_RULES } from '@/services/xp';
import { addDaysISO, lastNDays, todayISO, weekdayName } from '@/utils/date';
import { cn, pct } from '@/utils/misc';

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];
const ICONS = ['✅', '📚', '💻', '🏃', '🌅', '💧', '🧘', '📖', '🛏️', '🍎', '🚫', '✍️'];

export function Habits() {
  const data = useData();
  const index = useIndex();
  const activeDate = useDataStore((s) => s.activeDate);
  const setActiveDate = useDataStore((s) => s.setActiveDate);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  const today = todayISO();
  const last30 = useMemo(() => lastNDays(30, today), [today]);
  const active = data.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);

  // Completion rate per habit over the last 30 days, counting only days the
  // habit was actually due.
  const rates = useMemo(() => {
    const map = new Map<string, { due: number; done: number }>();
    for (const h of active) map.set(h.id, { due: 0, done: 0 });
    for (const date of last30) {
      const due = habitsDueOn(active, date);
      const log = index.logs.get(date);
      for (const h of due) {
        const entry = map.get(h.id);
        if (!entry) continue;
        entry.due += 1;
        if (log?.habitsDone.includes(h.id)) entry.done += 1;
      }
    }
    return map;
  }, [active, last30, index]);

  const heatCells = useMemo<HeatmapCell[]>(() => {
    const start = addDaysISO(today, -181);
    const out: HeatmapCell[] = [];
    for (const log of data.dailyLogs) {
      if (log.date < start || log.date > today) continue;
      const due = habitsDueOn(active, log.date).length;
      if (due === 0) continue;
      const done = log.habitsDone.length;
      out.push({
        date: log.date,
        intensity: due === 0 ? 0 : Math.min(1, done / due),
        label: `${log.date} · ${done} of ${due} habits`,
      });
    }
    return out;
  }, [data.dailyLogs, active, today]);

  const todayDue = habitsDueOn(active, activeDate);
  const todayLog = index.logs.get(activeDate);
  const todayDone = todayDue.filter((h) => todayLog?.habitsDone.includes(h.id)).length;

  const perfect = [...rates.values()].filter((r) => r.due > 0 && r.done === r.due).length;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Habits"
        subtitle={`${active.length} active · ${todayDone} of ${todayDue.length} done today`}
        action={
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
            <Plus size={15} /> New habit
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Today"
          value={`${todayDone}/${todayDue.length}`}
          hint={todayDue.length === 0 ? 'Nothing due' : 'Habits completed'}
          tone="var(--c-ok)"
        />
        <StatCard
          label="Habit streak"
          value={`${data.streaks.streaks.habits.current}d`}
          hint={`Best ${data.streaks.streaks.habits.best}`}
          tone="var(--c-danger)"
        />
        <StatCard
          label="Perfect (30d)"
          value={perfect}
          hint="Habits never missed when due"
          tone="var(--c-warn)"
        />
      </div>

      <Card>
        <CardHeader title="Consistency" subtitle="Share of habits completed each day, last 6 months" />
        <div className="p-4">
          <Heatmap cells={heatCells} end={today} weeks={26} tone="var(--c-ok)" weekStartsOn={data.settings.weekStartsOn} onSelect={setActiveDate} />
        </div>
      </Card>

      {active.length === 0 ? (
        <Card>
          <div className="p-2">
            <EmptyState
              icon={<CheckCircle2 size={20} />}
              title="No habits yet"
              message="Two or three habits you can actually keep beat a long list you can't."
              action={
                <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Add a habit
                </button>
              }
            />
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Your habits" subtitle="Last 30 days, counting only the days each habit was due" />
          <ul className="divide-y divide-line">
            {active.map((habit) => {
              const r = rates.get(habit.id) ?? { due: 0, done: 0 };
              const rate = pct(r.done, r.due);
              const doneToday = todayLog?.habitsDone.includes(habit.id) ?? false;
              const dueToday = todayDue.some((h) => h.id === habit.id);
              return (
                <li key={habit.id} className="group flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    aria-pressed={doneToday}
                    aria-label={doneToday ? `Undo ${habit.name}` : `Complete ${habit.name}`}
                    disabled={!dueToday}
                    onClick={() => toggleHabit(habit.id, activeDate)}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl border text-base transition-colors',
                      doneToday ? 'border-transparent' : 'border-line hover:bg-elevated',
                      !dueToday && 'opacity-40',
                    )}
                    style={doneToday ? { background: `${habit.color}22`, borderColor: `${habit.color}66` } : undefined}
                  >
                    <Glyph name={habit.icon} size={16} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {habit.name}
                      {habit.inverse && <span className="ml-2 chip text-warn">avoid</span>}
                    </p>
                    <p className="text-[11px] text-muted">
                      {describeFreq(habit)} · {habit.xp} XP · {r.done}/{r.due} in 30d
                    </p>
                    <ProgressBar
                      className="mt-1.5 max-w-xs"
                      value={rate / 100}
                      tone={rate >= 80 ? 'ok' : rate >= 50 ? 'accent' : 'warn'}
                      label={`${habit.name} completion rate`}
                    />
                  </div>

                  <span className="shrink-0 text-sm tabular text-muted">{rate}%</span>

                  <button
                    type="button"
                    className="btn-icon h-7 w-7 opacity-0 focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Edit ${habit.name}`}
                    onClick={() => setEditing(habit)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon h-7 w-7 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete ${habit.name}`}
                    onClick={() =>
                      confirmAction({
                        title: `Delete "${habit.name}"?`,
                        message:
                          'The habit and every completion recorded against it will be removed. XP already earned stays. This cannot be undone.',
                        confirmLabel: 'Delete habit',
                        danger: true,
                        onConfirm: () => deleteHabit(habit.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {(creating || editing) && (
        <HabitDialog
          habit={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function describeFreq(h: Pick<Habit, 'freq'> & Partial<Pick<Habit, 'timesPerWeek' | 'daysOfWeek'>>): string {
  if (h.freq === 'daily') return 'Every day';
  if (h.freq === 'weekly') return `${h.timesPerWeek ?? 1}× per week`;
  const days = h.daysOfWeek ?? [];
  if (days.length === 0) return 'No days selected';
  return days.map((d) => weekdayName(d, true)).join(', ');
}

/* ------------------------------------------------------------------ */

function HabitDialog({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const toast = useFeedbackStore((s) => s.toast);
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? '✅');
  const [color, setColor] = useState(habit?.color ?? PALETTE[0]);
  const [freq, setFreq] = useState<HabitFreq>(habit?.freq ?? 'daily');
  const [timesPerWeek, setTimesPerWeek] = useState(String(habit?.timesPerWeek ?? 3));
  const [daysOfWeek, setDaysOfWeek] = useState<Weekday[]>(habit?.daysOfWeek ?? [1, 3, 5]);
  const [inverse, setInverse] = useState(habit?.inverse ?? false);
  const [xp, setXp] = useState(String(habit?.xp ?? XP_RULES.habit));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = {
      name: trimmed,
      icon,
      color,
      freq,
      timesPerWeek: freq === 'weekly' ? Math.max(1, Number(timesPerWeek) || 1) : undefined,
      daysOfWeek: freq === 'custom' ? daysOfWeek : undefined,
      inverse,
      xp: Math.max(0, Number(xp) || 0),
    };
    if (habit) {
      updateHabit(habit.id, payload);
      toast({ kind: 'success', title: 'Habit updated' });
    } else {
      createHabit(payload);
      toast({ kind: 'success', title: 'Habit added', message: describeFreq(payload) });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!name.trim()}>
            {habit ? 'Save changes' : 'Add habit'}
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
          <span className="label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Read 20 pages"
            data-autofocus
          />
        </label>

        <div>
          <span className="label">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Icon ${i}`}
                aria-pressed={icon === i}
                onClick={() => setIcon(i)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-ctl border text-base transition-colors',
                  icon === i ? 'border-accent bg-accent-soft' : 'border-line hover:bg-elevated',
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn('h-7 w-7 rounded-full border-2', color === c ? 'border-ink' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Frequency</span>
            <select className="input" value={freq} onChange={(e) => setFreq(e.target.value as HabitFreq)}>
              <option value="daily">Every day</option>
              <option value="weekly">A number of times per week</option>
              <option value="custom">Specific weekdays</option>
            </select>
          </label>
          <label className="block">
            <span className="label">XP per completion</span>
            <input type="number" min={0} max={50} className="input tabular" value={xp} onChange={(e) => setXp(e.target.value)} />
          </label>
        </div>

        {freq === 'weekly' && (
          <label className="block">
            <span className="label">Times per week</span>
            <input
              type="number"
              min={1}
              max={7}
              className="input tabular"
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(e.target.value)}
            />
          </label>
        )}

        {freq === 'custom' && (
          <div>
            <span className="label">Days</span>
            <div className="flex flex-wrap gap-1.5">
              {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={daysOfWeek.includes(d)}
                  onClick={() =>
                    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
                  }
                  className={cn(
                    'h-9 w-11 rounded-ctl border text-xs font-medium transition-colors',
                    daysOfWeek.includes(d) ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:bg-elevated',
                  )}
                >
                  {weekdayName(d, true)}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-start gap-2.5 rounded-ctl border border-line p-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={inverse}
            onChange={(e) => setInverse(e.target.checked)}
          />
          <span className="text-sm">
            <span className="text-ink">This is something to avoid</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              Tick it on days you successfully avoided it — the win is the day you don't do it.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
