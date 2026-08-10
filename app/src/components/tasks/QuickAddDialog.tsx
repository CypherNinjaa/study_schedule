import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { RecurrenceKind, TaskCategory, TaskPriority, Task } from '@/types';
import { createTask, deleteTask, updateTask } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/utils/confirm';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { taskXP } from '@/services/xp';

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
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const RECURRENCES: { value: RecurrenceKind | 'none'; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

interface Draft {
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  category: TaskCategory;
  subjectId: string;
  priority: TaskPriority;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: string;
  recurrence: RecurrenceKind | 'none';
  notes: string;
}

const blank = (date: string): Draft => ({
  title: '',
  description: '',
  date,
  start: '',
  end: '',
  category: 'study',
  subjectId: '',
  priority: 'medium',
  difficulty: 2,
  estimatedMinutes: '',
  recurrence: 'none',
  notes: '',
});

const fromTask = (t: Task): Draft => ({
  title: t.title,
  description: t.description,
  date: t.date,
  start: t.start ?? '',
  end: t.end ?? '',
  category: t.category,
  subjectId: t.subjectId ?? '',
  priority: t.priority,
  difficulty: t.difficulty,
  estimatedMinutes: t.estimatedMinutes === null ? '' : String(t.estimatedMinutes),
  recurrence: t.recurrence?.kind ?? 'none',
  notes: t.notes,
});

export function QuickAddDialog() {
  const editing = useUiStore((s) => s.taskEditorId);
  const quickAdd = useUiStore((s) => s.quickAddOpen);
  const quickAddDate = useUiStore((s) => s.quickAddDate);
  const close = useUiStore((s) => s.closeTaskDialogs);
  const activeDate = useDataStore((s) => s.activeDate);
  const subjects = useDataStore((s) => s.data?.subjects ?? []);
  const task = useDataStore((s) => (editing ? s.data?.tasks.find((t) => t.id === editing) : undefined));
  const toast = useFeedbackStore((s) => s.toast);

  const open = quickAdd || Boolean(editing);
  const initial = useMemo(
    () => (task ? fromTask(task) : blank(quickAddDate ?? activeDate)),
    [task, quickAddDate, activeDate],
  );
  const [draft, setDraft] = useState<Draft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  if (!open) return null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const title = draft.title.trim();
    if (!title) return;
    const payload = {
      title,
      description: draft.description,
      date: draft.date,
      start: draft.start || null,
      end: draft.end || null,
      category: draft.category,
      subjectId: draft.subjectId || null,
      priority: draft.priority,
      difficulty: draft.difficulty,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : null,
      notes: draft.notes,
      recurrence:
        draft.recurrence === 'none'
          ? null
          : { kind: draft.recurrence, interval: 1, daysOfWeek: undefined, until: null },
    };

    if (task) {
      updateTask(task.id, payload);
      toast({ kind: 'success', title: 'Task updated' });
    } else {
      createTask(payload);
      toast({ kind: 'success', title: 'Task added', message: `${payload.date} · worth ${taskXP(draft.difficulty, draft.priority)} XP` });
    }
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={task ? 'Edit task' : 'New task'}
      size="md"
      footer={
        <>
          {task && (
            <button
              type="button"
              className="btn-ghost mr-auto gap-1.5 text-danger hover:bg-danger/10"
              onClick={() =>
                confirmAction({
                  title: 'Delete this task?',
                  message: `"${task.title}" will be removed. This can't be undone.`,
                  confirmLabel: 'Delete',
                  danger: true,
                  onConfirm: () => {
                    deleteTask(task.id);
                    close();
                  },
                })
              }
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
          <button type="button" className="btn-outline" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!draft.title.trim()}>
            {task ? 'Save changes' : 'Add task'}
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
          <span className="label">Title</span>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Revise Java collections"
            data-autofocus
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Start</span>
            <input type="time" className="input" value={draft.start} onChange={(e) => set('start', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">End</span>
            <input type="time" className="input" value={draft.end} onChange={(e) => set('end', e.target.value)} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Category</span>
            <select className="input" value={draft.category} onChange={(e) => set('category', e.target.value as TaskCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select className="input" value={draft.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Priority</span>
            <select className="input" value={draft.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Difficulty</span>
            <select
              className="input"
              value={draft.difficulty}
              onChange={(e) => set('difficulty', Number(e.target.value) as Draft['difficulty'])}
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Estimate (min)</span>
            <input
              type="number"
              min={0}
              step={5}
              className="input"
              value={draft.estimatedMinutes}
              onChange={(e) => set('estimatedMinutes', e.target.value)}
              placeholder="45"
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Repeat</span>
          <select
            className="input"
            value={draft.recurrence}
            onChange={(e) => set('recurrence', e.target.value as Draft['recurrence'])}
          >
            {RECURRENCES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Notes</span>
          <textarea
            className="input min-h-[70px] resize-y"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Anything worth remembering"
          />
        </label>
      </form>
    </Modal>
  );
}
