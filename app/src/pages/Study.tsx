import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Clock, Flame, Pencil, Plus, Timer, Trash2 } from 'lucide-react';
import type { StudyMethod, StudySession } from '@/types';
import { deleteStudySession, logStudySession, updateStudySession } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useData, useDayMetrics, useRangeMetrics } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar, Segmented, StatCard } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/ConfirmDialog';
import { confirmAction } from '@/utils/confirm';
import { Modal } from '@/components/ui/Modal';
import { PomodoroTimer } from '@/components/study/PomodoroTimer';
import { subjectStats } from '@/services/metrics';
import { studySessionXP } from '@/services/xp';
import {
  addDaysISO,
  durationBetween,
  formatDateShort,
  formatHHMM12,
  formatMinutes,
  relativeDayLabel,
  todayISO,
} from '@/utils/date';
import { cn } from '@/utils/misc';

const METHODS: StudyMethod[] = [
  'reading',
  'practice',
  'revision',
  'problem_solving',
  'lecture',
  'coding',
  'mock_test',
  'flashcards',
];

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
];

const PAGE_SIZE = 6;

export function Study() {
  const data = useData();
  const activeDate = useDataStore((s) => s.activeDate);
  const [days, setDays] = useState('7');
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);

  const to = todayISO();
  const from = addDaysISO(to, -(Number(days) - 1));
  const range = useRangeMetrics(from, to);

  const todayMinutes = useDayMetrics(activeDate).studyMinutes;
  const target = data.settings.targets.study;

  const recent = useMemo(
    () =>
      data.studySessions
        .filter((s) => s.date >= from && s.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [data.studySessions, from, to],
  );

  useEffect(() => {
    setPage(1);
  }, [days, recent.length]);

  const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecent = recent.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => subjectStats(data, from, to).filter((s) => !s.subject.archived), [data, from, to]);
  const maxSubjectMinutes = Math.max(1, ...stats.map((s) => s.minutes));

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Study"
        subtitle={`${formatMinutes(range.studyMinutes)} over the last ${days} days · ${range.sessions} sessions`}
        action={
          <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
            <Plus size={15} /> Log session
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen size={18} />}
          label="Today"
          value={formatMinutes(todayMinutes)}
          hint={`Target ${formatMinutes(target)}`}
          tone="var(--c-study)"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Daily average"
          value={formatMinutes(Math.round(range.studyMinutes / Math.max(1, range.days.length)))}
          hint={`Across ${days} days`}
        />
        <StatCard
          icon={<Timer size={18} />}
          label="Pomodoros"
          value={range.pomodoros}
          hint="Completed focus rounds"
          tone="var(--c-warn)"
        />
        <StatCard
          icon={<Flame size={18} />}
          label="Study streak"
          value={`${data.streaks.streaks.study.current}d`}
          hint={`Best ${data.streaks.streaks.study.best}`}
          tone="var(--c-danger)"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <PomodoroTimer />

        <div className="space-y-3">
          <Card>
            <CardHeader
              title="Today's progress"
              subtitle={`${formatMinutes(todayMinutes)} of ${formatMinutes(target)}`}
              action={<span className="chip">{relativeDayLabel(activeDate)}</span>}
            />
            <div className="p-4">
              <ProgressBar value={todayMinutes / target} tone="study" label="Study against target" />
              <p className="mt-2 text-xs text-muted">
                {todayMinutes >= target
                  ? 'Target met. Anything more is a bonus.'
                  : `${formatMinutes(target - todayMinutes)} to go.`}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="By subject"
              subtitle={`Last ${days} days`}
              action={<Segmented value={days} onChange={setDays} options={RANGES} size="sm" />}
            />
            {stats.length === 0 ? (
              <div className="p-2">
                <EmptyState
                  icon={<BookOpen size={20} />}
                  title="No subjects yet"
                  message="Add subjects to see where your study time actually goes."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {stats
                  .slice()
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((s) => (
                    <li key={s.subject.id} className="px-4 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.subject.color }} />
                          <span className="truncate">{s.subject.code}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular text-muted">
                          {formatMinutes(s.minutes, { short: true })} · {s.sessions} sess
                        </span>
                      </div>
                      <ProgressBar
                        className="mt-1.5"
                        value={s.minutes / maxSubjectMinutes}
                        label={`${s.subject.code} study time`}
                      />
                      <p className="mt-1 text-[11px] text-muted">
                        {s.topicsDone}/{s.topicsTotal} topics
                        {s.avgConcentration !== null && ` · focus ${s.avgConcentration.toFixed(1)}/5`}
                        {s.lastStudied ? ` · last ${formatDateShort(s.lastStudied)}` : ' · not studied yet'}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Sessions"
          subtitle={`${recent.length} in the last ${days} days`}
          action={
            <div className="flex items-center gap-2">
              <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => setCreating(true)}>
                <Plus size={14} /> Log
              </button>
            </div>
          }
        />
        {recent.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={<Timer size={20} />}
              title="No sessions logged"
              message="Run a Pomodoro or log a session by hand — both count the same."
              action={
                <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => setCreating(true)}>
                  <Plus size={15} /> Log a session
                </button>
              }
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {paginatedRecent.map((s) => {
                const subject = data.subjects.find((sub) => sub.id === s.subjectId);
                return (
                  <li key={s.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <span
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ background: subject?.color ?? 'rgb(var(--line))' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{s.topic || subject?.name || 'Study session'}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                        <span className="tabular">{formatDateShort(s.date)}</span>
                        {s.start && <span className="tabular">{formatHHMM12(s.start)}</span>}
                        <span className="tabular">{formatMinutes(s.minutes, { short: true })}</span>
                        <span>{s.method.replace('_', ' ')}</span>
                        <span>focus {s.concentration}/5</span>
                        {s.fromPomodoro && <span className="text-accent font-medium">pomodoro</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-icon h-7 w-7 opacity-0 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Edit session ${s.topic || s.date}`}
                      onClick={() => setEditing(s)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon h-7 w-7 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Delete session ${s.topic || s.date}`}
                      onClick={() =>
                        confirmAction({
                          title: 'Delete this session?',
                          message: `${formatMinutes(s.minutes)} on ${formatDateShort(s.date)} will be removed, and the XP it earned comes off your total.`,
                          confirmLabel: 'Delete',
                          danger: true,
                          onConfirm: () => deleteStudySession(s.id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, recent.length)} of {recent.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="tabular px-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {(creating || editing) && (
        <SessionDialog
          session={editing}
          defaultDate={activeDate}
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

interface Draft {
  date: string;
  subjectId: string;
  topicId: string;
  topic: string;
  start: string;
  end: string;
  minutes: string;
  method: StudyMethod;
  concentration: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

function SessionDialog({
  session,
  defaultDate,
  onClose,
}: {
  session: StudySession | null;
  defaultDate: string;
  onClose: () => void;
}) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const [draft, setDraft] = useState<Draft>(() =>
    session
      ? {
          date: session.date,
          subjectId: session.subjectId ?? '',
          topicId: session.topicId ?? '',
          topic: session.topic,
          start: session.start ?? '',
          end: session.end ?? '',
          minutes: String(session.minutes),
          method: session.method,
          concentration: session.concentration,
          difficulty: session.difficulty,
          notes: session.notes,
        }
      : {
          date: defaultDate,
          subjectId: '',
          topicId: '',
          topic: '',
          start: '',
          end: '',
          minutes: '45',
          method: 'reading',
          concentration: 3,
          difficulty: 3,
          notes: '',
        },
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Typing both ends fills in the length; typing a length by hand still wins.
  const setTime = (key: 'start' | 'end', value: string) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (next.start && next.end) next.minutes = String(durationBetween(next.start, next.end));
      return next;
    });
  };

  const subject = data.subjects.find((s) => s.id === draft.subjectId);
  const minutes = Math.max(0, Number(draft.minutes) || 0);

  const submit = () => {
    if (minutes <= 0) return;
    const payload = {
      date: draft.date,
      subjectId: draft.subjectId || null,
      topicId: draft.topicId || null,
      topic: draft.topic.trim(),
      start: draft.start || null,
      end: draft.end || null,
      minutes,
      method: draft.method,
      concentration: draft.concentration,
      difficulty: draft.difficulty,
      notes: draft.notes,
    };
    if (session) {
      updateStudySession(session.id, payload);
      toast({ kind: 'success', title: 'Session updated' });
    } else {
      logStudySession(payload);
      toast({
        kind: 'success',
        title: 'Session logged',
        message: `${formatMinutes(minutes)} · +${studySessionXP(minutes)} XP`,
      });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={session ? 'Edit session' : 'Log a study session'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={minutes <= 0}>
            {session ? 'Save changes' : `Log ${formatMinutes(minutes)}`}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Subject</span>
            <select
              className="input"
              value={draft.subjectId}
              onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value, topicId: '' }))}
            >
              <option value="">No subject</option>
              {data.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Topic</span>
            {subject && subject.topics.length > 0 ? (
              <select
                className="input"
                value={draft.topicId}
                onChange={(e) => {
                  const t = subject.topics.find((x) => x.id === e.target.value);
                  setDraft((d) => ({ ...d, topicId: e.target.value, topic: t?.title ?? d.topic }));
                }}
              >
                <option value="">Free text</option>
                {subject.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.done ? '✓ ' : ''}
                    {t.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                value={draft.topic}
                onChange={(e) => set('topic', e.target.value)}
                placeholder="What you studied"
              />
            )}
          </label>
        </div>

        {subject && subject.topics.length > 0 && (
          <label className="block">
            <span className="label">Note on the topic</span>
            <input
              className="input"
              value={draft.topic}
              onChange={(e) => set('topic', e.target.value)}
              placeholder="What you studied"
            />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Start</span>
            <input type="time" className="input" value={draft.start} onChange={(e) => setTime('start', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">End</span>
            <input type="time" className="input" value={draft.end} onChange={(e) => setTime('end', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Minutes</span>
            <input
              type="number"
              min={1}
              step={5}
              className="input tabular"
              value={draft.minutes}
              onChange={(e) => set('minutes', e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Method</span>
            <select className="input" value={draft.method} onChange={(e) => set('method', e.target.value as StudyMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <Rating label="Concentration" value={draft.concentration} onChange={(v) => set('concentration', v)} />
          <Rating label="Difficulty" value={draft.difficulty} onChange={(v) => set('difficulty', v)} />
        </div>

        <label className="block">
          <span className="label">Notes</span>
          <textarea
            className="input min-h-[60px] resize-y"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="What clicked, what didn't"
          />
        </label>
      </form>
    </Modal>
  );
}

function Rating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} of 5`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'h-9 flex-1 rounded-ctl border text-xs font-semibold tabular transition-colors',
              value === n ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:bg-elevated',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
