import { useMemo, useState } from 'react';
import { ListFilter, Plus, Search, Sparkles } from 'lucide-react';
import type { Task, TaskCategory, TaskPriority } from '@/types';
import { useData } from '@/hooks/useMetrics';
import { useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { Card, CardHeader, PageHeader, Segmented } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { TaskRow } from '@/components/tasks/TaskRow';
import { formatDateLong, relativeDayLabel, todayISO, addDaysISO } from '@/utils/date';

type View = 'open' | 'today' | 'week' | 'done' | 'all';

const VIEWS: { value: View; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
];

const CATEGORIES: TaskCategory[] = [
  'study',
  'college',
  'coding',
  'project',
  'assignment',
  'exercise',
  'personal',
  'relationship',
  'other',
];

const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Every task in one place, with the filters that actually get used. */
export function Tasks() {
  const data = useData();
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const activeDate = useDataStore((s) => s.activeDate);

  const [view, setView] = useState<View>('open');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TaskCategory | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [sort, setSort] = useState<'date' | 'priority'>('date');

  const today = todayISO();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const weekEndISO = addDaysISO(today, 7);

    return data.tasks
      .filter((t) => {
        const done = t.status === 'completed';
        if (view === 'open' && (done || t.status === 'skipped')) return false;
        if (view === 'done' && !done) return false;
        if (view === 'today' && t.date !== today) return false;
        if (view === 'week' && (t.date < today || t.date > weekEndISO)) return false;
        if (category && t.category !== category) return false;
        if (subjectId && t.subjectId !== subjectId) return false;
        if (q && !`${t.title} ${t.description} ${t.notes}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) =>
        sort === 'priority'
          ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            a.date.localeCompare(b.date) ||
            a.order - b.order
          : a.date.localeCompare(b.date) ||
            (a.start ?? '99:99').localeCompare(b.start ?? '99:99') ||
            a.order - b.order,
      );
  }, [data.tasks, view, query, category, subjectId, sort, today]);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered) {
      const list = map.get(t.date);
      if (list) list.push(t);
      else map.set(t.date, [t]);
    }
    return [...map.entries()];
  }, [filtered]);

  const overdue = data.tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'skipped' && t.date < today,
  );

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Tasks"
        subtitle={`${filtered.length} shown · ${overdue.length} overdue`}
        action={
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd(activeDate)}>
            <Plus size={15} /> Add
          </button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-end gap-3 p-3">
          <label className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="input pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              aria-label="Search tasks"
            />
          </label>
          <label className="block">
            <span className="label">Category</span>
            <select className="input w-36" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory | '')}>
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select className="input w-40" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label flex items-center gap-1">
              <ListFilter size={12} /> Sort
            </span>
            <select className="input w-32" value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'priority')}>
              <option value="date">By date</option>
              <option value="priority">By priority</option>
            </select>
          </label>
        </div>
        <div className="border-t border-line p-3">
          <Segmented value={view} onChange={setView} options={VIEWS} />
        </div>
      </Card>

      {overdue.length > 0 && view !== 'done' && (
        <Card>
          <CardHeader
            title="Overdue"
            subtitle="Move them forward or let them go — a stale list stops being useful"
            action={<span className="chip text-danger">{overdue.length}</span>}
          />
          <div className="p-2">
            {overdue.slice(0, 8).map((t) => (
              <TaskRow key={t.id} task={t} showDate />
            ))}
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card>
          <div className="p-2">
            <EmptyState
              icon={<Sparkles size={20} />}
              title="Nothing matches"
              message={query || category || subjectId ? 'Try widening the filters.' : 'Add a task to get started.'}
              action={
                <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd(activeDate)}>
                  <Plus size={15} /> Add a task
                </button>
              }
            />
          </div>
        </Card>
      ) : (
        groups.map(([date, list]) => (
          <Card key={date}>
            <CardHeader
              title={relativeDayLabel(date)}
              subtitle={formatDateLong(date)}
              action={<span className="chip">{list.length}</span>}
            />
            <div className="p-2">
              {list.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
