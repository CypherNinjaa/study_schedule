import { useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ClipboardList, GraduationCap, Plus, Trash2 } from 'lucide-react';
import type { Subject } from '@/types';
import {
  addAssignment,
  addTopic,
  createSubject,
  deleteAssignment,
  deleteSubject,
  deleteTopic,
  toggleAssignment,
  toggleTopic,
  updateSubject,
} from '@/store/actions';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useData } from '@/hooks/useMetrics';
import { Card, PageHeader, ProgressBar, Segmented, StatCard } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { confirmAction } from '@/utils/confirm';
import { Modal } from '@/components/ui/Modal';
import { subjectStats, type SubjectStats } from '@/services/metrics';
import { diffDaysISO, formatDateShort, formatMinutes, todayISO } from '@/utils/date';
import { cn, pct } from '@/utils/misc';

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function Subjects() {
  const data = useData();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState<Subject | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const stats = useMemo(() => subjectStats(data), [data]);
  const shown = useMemo(
    () =>
      stats
        .filter((s) =>
          filter === 'all' ? true : filter === 'archived' ? s.subject.archived : !s.subject.archived,
        )
        .sort((a, b) => a.subject.code.localeCompare(b.subject.code)),
    [stats, filter],
  );

  const activeSubjects = stats.filter((s) => !s.subject.archived);
  const topicsDone = activeSubjects.reduce((a, s) => a + s.topicsDone, 0);
  const topicsTotal = activeSubjects.reduce((a, s) => a + s.topicsTotal, 0);
  const assignmentsOpen = activeSubjects.reduce((a, s) => a + s.assignmentsOpen, 0);
  const nextExam = activeSubjects
    .filter((s) => s.subject.examDate !== null && s.subject.examDate >= today)
    .sort((a, b) => (a.subject.examDate ?? '').localeCompare(b.subject.examDate ?? ''))[0];

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Subjects"
        subtitle={`${activeSubjects.length} active · ${topicsDone} of ${topicsTotal} topics done`}
        action={
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
            <Plus size={15} /> New subject
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard icon={<BookOpen size={18} />} label="Subjects" value={activeSubjects.length} hint="Not archived" />
        <StatCard
          icon={<Check size={18} />}
          label="Syllabus"
          value={`${pct(topicsDone, topicsTotal)}%`}
          hint={topicsTotal === 0 ? 'No topics added yet' : `${topicsDone}/${topicsTotal} topics`}
          tone="var(--c-ok)"
        />
        <StatCard
          icon={<ClipboardList size={18} />}
          label="Assignments"
          value={assignmentsOpen}
          hint="Still open"
          tone="var(--c-warn)"
        />
        <StatCard
          icon={<GraduationCap size={18} />}
          label="Next exam"
          value={nextExam ? `${diffDaysISO(today, nextExam.subject.examDate!)}d` : '—'}
          hint={nextExam ? `${nextExam.subject.code} · ${formatDateShort(nextExam.subject.examDate!)}` : 'No exam dates set'}
          tone="var(--c-danger)"
        />
      </div>

      <Segmented value={filter} onChange={setFilter} options={FILTERS} />

      {shown.length === 0 ? (
        <Card>
          <div className="p-2">
            <EmptyState
              icon={<BookOpen size={20} />}
              title={filter === 'archived' ? 'Nothing archived' : 'No subjects yet'}
              message="Add your semester subjects to track study time, syllabus topics, and assignments against each one."
              action={
                <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Add a subject
                </button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {shown.map((s) => (
            <SubjectCard key={s.subject.id} stats={s} today={today} onEdit={() => setEditing(s.subject)} />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <SubjectDialog
          subject={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SubjectCard({ stats, today, onEdit }: { stats: SubjectStats; today: string; onEdit: () => void }) {
  const { subject: s } = stats;
  const [open, setOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDue, setAssignDue] = useState('');

  const daysToExam = s.examDate ? diffDaysISO(today, s.examDate) : null;

  return (
    <Card className={cn(s.archived && 'opacity-70')}>
      <div className="flex items-start gap-3 p-4">
        <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-medium text-ink">{s.name}</p>
            <span className="chip">{s.code}</span>
            {s.archived && <span className="chip text-muted">archived</span>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
            {s.teacher && <span>{s.teacher}</span>}
            <span>{s.credits} credits</span>
            <span>difficulty {s.difficulty}/5</span>
            {daysToExam !== null && (
              <span className={cn('tabular', daysToExam >= 0 && daysToExam <= 14 && 'text-danger')}>
                {daysToExam < 0
                  ? `Exam was ${formatDateShort(s.examDate!)}`
                  : daysToExam === 0
                    ? 'Exam today'
                    : `Exam in ${daysToExam}d · ${formatDateShort(s.examDate!)}`}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="btn-icon h-7 w-7"
          aria-label={open ? `Collapse ${s.name}` : `Expand ${s.name}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Syllabus</span>
            <span className="tabular text-ink">
              {stats.topicsDone}/{stats.topicsTotal} topics
            </span>
          </div>
          <ProgressBar className="mt-1.5" value={stats.topicProgress / 100} tone="ok" label={`${s.name} syllabus`} />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Study time</span>
            <span className="tabular text-ink">
              {formatMinutes(stats.minutes, { short: true })}
              {s.targetMinutes > 0 && ` of ${formatMinutes(s.targetMinutes, { short: true })}`}
            </span>
          </div>
          <ProgressBar className="mt-1.5" value={stats.targetProgress / 100} label={`${s.name} study target`} />
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <div>
            <p className="label">Topics</p>
            {s.topics.length === 0 ? (
              <p className="text-xs text-muted">No topics yet. Add them from your syllabus, one line at a time.</p>
            ) : (
              <ul className="mb-2 space-y-1">
                {s.topics.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={t.title}
                      onClick={() => toggleTopic(s.id, t.id)}
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        t.done ? 'border-transparent bg-ok text-white' : 'border-line hover:border-accent',
                      )}
                    >
                      {t.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <span className={cn('min-w-0 flex-1 truncate text-sm', t.done ? 'text-muted line-through' : 'text-ink')}>
                      {t.module && <span className="mr-1.5 text-[11px] text-faint">{t.module}</span>}
                      {t.title}
                    </span>
                    <button
                      type="button"
                      className="btn-icon h-6 w-6 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Delete topic ${t.title}`}
                      onClick={() => deleteTopic(s.id, t.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!topicTitle.trim()) return;
                addTopic(s.id, topicTitle.trim());
                setTopicTitle('');
              }}
            >
              <input
                className="input h-8 flex-1 text-sm"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Add a topic"
              />
              <button type="submit" className="btn-outline btn-sm" disabled={!topicTitle.trim()}>
                Add
              </button>
            </form>
          </div>

          <div>
            <p className="label">Assignments</p>
            {s.assignments.length === 0 ? (
              <p className="text-xs text-muted">Nothing due.</p>
            ) : (
              <ul className="mb-2 space-y-1">
                {s.assignments.map((a) => {
                  const overdue = !a.done && a.dueDate !== null && a.dueDate < today;
                  return (
                    <li key={a.id} className="group flex items-center gap-2">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={a.done}
                        aria-label={a.title}
                        onClick={() => toggleAssignment(s.id, a.id)}
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          a.done ? 'border-transparent bg-ok text-white' : 'border-line hover:border-accent',
                        )}
                      >
                        {a.done && <Check size={11} strokeWidth={3} />}
                      </button>
                      <span className={cn('min-w-0 flex-1 truncate text-sm', a.done ? 'text-muted line-through' : 'text-ink')}>
                        {a.title}
                      </span>
                      {a.dueDate && (
                        <span className={cn('shrink-0 text-[11px] tabular', overdue ? 'text-danger' : 'text-muted')}>
                          {formatDateShort(a.dueDate)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn-icon h-6 w-6 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Delete assignment ${a.title}`}
                        onClick={() => deleteAssignment(s.id, a.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!assignTitle.trim()) return;
                addAssignment(s.id, { title: assignTitle.trim(), dueDate: assignDue || null });
                setAssignTitle('');
                setAssignDue('');
              }}
            >
              <input
                className="input h-8 min-w-[10rem] flex-1 text-sm"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="Add an assignment"
              />
              <input
                type="date"
                className="input h-8 w-40 text-sm"
                value={assignDue}
                onChange={(e) => setAssignDue(e.target.value)}
                aria-label="Due date"
              />
              <button type="submit" className="btn-outline btn-sm" disabled={!assignTitle.trim()}>
                Add
              </button>
            </form>
          </div>

          <label className="block">
            <span className="label">Notes</span>
            <textarea
              className="input min-h-[60px] resize-y text-sm"
              value={s.notes}
              onChange={(e) => updateSubject(s.id, { notes: e.target.value })}
              placeholder="Anything worth remembering about this subject"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => updateSubject(s.id, { archived: !s.archived })}
            >
              {s.archived ? 'Restore subject' : 'Archive subject'}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm gap-1.5 text-danger hover:bg-danger/10"
              onClick={() =>
                confirmAction({
                  title: `Delete "${s.name}"?`,
                  message: `The subject, its ${s.topics.length} topics and ${s.assignments.length} assignments will be removed. Study sessions and tasks stay, but they lose their link to this subject. Archiving keeps the history instead.`,
                  confirmLabel: 'Delete subject',
                  danger: true,
                  onConfirm: () => deleteSubject(s.id),
                })
              }
            >
              <Trash2 size={14} /> Delete
            </button>
            {stats.lastStudied && (
              <span className="ml-auto text-[11px] text-muted">
                Last studied {formatDateShort(stats.lastStudied)}
                {stats.avgConcentration !== null && ` · focus ${stats.avgConcentration}/5`}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function SubjectDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const toast = useFeedbackStore((s) => s.toast);
  const [code, setCode] = useState(subject?.code ?? '');
  const [name, setName] = useState(subject?.name ?? '');
  const [teacher, setTeacher] = useState(subject?.teacher ?? '');
  const [credits, setCredits] = useState(String(subject?.credits ?? 4));
  const [difficulty, setDifficulty] = useState(subject?.difficulty ?? 3);
  const [targetHours, setTargetHours] = useState(String(Math.round((subject?.targetMinutes ?? 1800) / 60)));
  const [color, setColor] = useState(subject?.color ?? PALETTE[0]);
  const [examDate, setExamDate] = useState(subject?.examDate ?? '');

  const submit = () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) return;
    const payload = {
      code: trimmedCode,
      name: trimmedName,
      teacher: teacher.trim(),
      credits: Math.max(0, Number(credits) || 0),
      difficulty,
      targetMinutes: Math.max(0, Math.round((Number(targetHours) || 0) * 60)),
      color,
      examDate: examDate || null,
    };
    if (subject) {
      updateSubject(subject.id, payload);
      toast({ kind: 'success', title: 'Subject updated' });
    } else {
      createSubject(payload);
      toast({ kind: 'success', title: 'Subject added', message: 'Add its syllabus topics to track progress' });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={subject ? 'Edit subject' : 'New subject'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={!name.trim() || !code.trim()}
          >
            {subject ? 'Save changes' : 'Add subject'}
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
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className="block">
            <span className="label">Code</span>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="BCA501"
              data-autofocus
            />
          </label>
          <label className="block">
            <span className="label">Name</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Database Management Systems"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="label">Teacher</span>
            <input className="input" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Credits</span>
            <input
              type="number"
              min={0}
              max={12}
              className="input tabular"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Study target (hours this semester)</span>
            <input
              type="number"
              min={0}
              className="input tabular"
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Exam date (optional)</span>
            <input type="date" className="input" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </label>
        </div>

        <div>
          <span className="label">How hard you find it</span>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4, 5] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={difficulty === d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'h-9 w-9 rounded-ctl border text-sm tabular transition-colors',
                  difficulty === d ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:bg-elevated',
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            Used to suggest where extra revision time is worth spending.
          </span>
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
      </form>
    </Modal>
  );
}


