import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck,
  GraduationCap,
  MapPin,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Exam, ExamSyllabusItem, HHMM, ISODate } from '@/types';
import {
  addExamSyllabusItem,
  createExam,
  deleteExam,
  removeExamSyllabusItem,
  toggleExamSyllabusItem,
  updateExam,
} from '@/store/actions';
import { useData } from '@/hooks/useMetrics';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { Card, PageHeader, ProgressBar, StatCard } from '@/components/ui/Primitives';
import { Modal } from '@/components/ui/Modal';
import { confirmAction } from '@/utils/confirm';
import { formatDateShort, formatHHMM12, todayISO } from '@/utils/date';
import { daysUntil } from '@/utils/time';
import { cn, pct } from '@/utils/misc';

export function Exams() {
  const data = useData();
  const today = todayISO();
  const exams = data.exams || [];

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [showPast, setShowPast] = useState(false);

  const upcoming = useMemo(
    () =>
      exams
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')),
    [exams, today],
  );

  const past = useMemo(
    () =>
      exams
        .filter((e) => e.date < today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [exams, today],
  );

  const nextExam = upcoming[0] ?? null;
  const daysToNext = nextExam ? daysUntil(nextExam.date, today) : null;

  // Average syllabus prep across upcoming exams
  const avgPrep = useMemo(() => {
    if (upcoming.length === 0) return 0;
    const totalItems = upcoming.reduce((sum, e) => sum + e.syllabus.length, 0);
    if (totalItems === 0) return 0;
    const totalChecked = upcoming.reduce((sum, e) => sum + e.syllabusChecked.length, 0);
    return Math.round((totalChecked / totalItems) * 100);
  }, [upcoming]);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Exams"
        subtitle={`${upcoming.length} upcoming · ${past.length} completed`}
        action={
          <button
            type="button"
            className="btn-primary btn-sm gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus size={15} /> Add exam
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<FileCheck size={18} />}
          label="Upcoming exams"
          value={upcoming.length}
          hint={upcoming.length === 0 ? 'No exams scheduled' : 'Scheduled this semester'}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Next exam in"
          value={daysToNext !== null ? (daysToNext === 0 ? 'Today' : `${daysToNext}d`) : '—'}
          hint={nextExam ? `${nextExam.title} · ${formatDateShort(nextExam.date)}` : 'None pending'}
          tone={
            daysToNext !== null && daysToNext <= 3
              ? 'var(--c-danger)'
              : daysToNext !== null && daysToNext <= 7
                ? 'var(--c-warn)'
                : undefined
          }
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Syllabus prepared"
          value={`${avgPrep}%`}
          hint="Average across upcoming exams"
          tone="var(--c-ok)"
        />
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <GraduationCap size={24} />
            </div>
            <p className="mt-3 text-base font-semibold text-ink">No exams scheduled yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Add your mid-term, end-term, or practical exam schedules to track countdowns, venues,
              and syllabus preparation checklist.
            </p>
            <button
              type="button"
              className="btn-primary btn-sm mt-4 gap-1.5"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} /> Add first exam
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {upcoming.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                today={today}
                onEdit={() => setEditing(exam)}
              />
            ))}
          </div>

          {past.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                className="btn-ghost btn-xs flex items-center gap-1.5 text-muted hover:text-ink"
                onClick={() => setShowPast(!showPast)}
              >
                {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {past.length} past exam{past.length === 1 ? '' : 's'}
              </button>

              {showPast && (
                <div className="mt-2 space-y-2 opacity-75">
                  {past.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      today={today}
                      isPast
                      onEdit={() => setEditing(exam)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <ExamDialog
          exam={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Exam Card
------------------------------------------------------------------ */

function ExamCard({
  exam,
  today,
  isPast = false,
  onEdit,
}: {
  exam: Exam;
  today: ISODate;
  isPast?: boolean;
  onEdit: () => void;
}) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === exam.subjectId);
  const daysLeft = daysUntil(exam.date, today);

  const [expanded, setExpanded] = useState(false);
  const [newSyllabusText, setNewSyllabusText] = useState('');

  const prepCount = exam.syllabusChecked.length;
  const totalCount = exam.syllabus.length;
  const prepProgress = pct(prepCount, totalCount);

  const urgencyColor =
    daysLeft <= 3
      ? 'text-danger border-danger/40 bg-danger/10'
      : daysLeft <= 7
        ? 'text-warn border-warn/40 bg-warn/10'
        : 'text-accent border-accent/40 bg-accent/10';

  const handleAddSyllabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSyllabusText.trim()) return;
    addExamSyllabusItem(exam.id, newSyllabusText.trim());
    setNewSyllabusText('');
  };

  return (
    <Card className={cn(isPast && 'opacity-65')}>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-ink">{exam.title}</h3>
              {subject && (
                <span
                  className="chip font-medium text-xs gap-1"
                  style={{
                    borderColor: `${subject.color}40`,
                    background: `${subject.color}15`,
                    color: subject.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: subject.color }}
                  />
                  {subject.code} · {subject.name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-accent" />
                {formatDateShort(exam.date)}
              </span>
              {exam.time && (
                <span className="flex items-center gap-1 tabular">
                  <Clock size={13} />
                  {formatHHMM12(exam.time)}
                  {exam.durationMinutes > 0 && ` (${exam.durationMinutes} min)`}
                </span>
              )}
              {exam.venue && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {exam.venue}
                </span>
              )}
            </div>

            {exam.notes && (
              <p className="text-xs text-muted line-clamp-2 pt-1">{exam.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            {!isPast && (
              <div
                className={cn(
                  'rounded-lg border px-3 py-1 text-center font-bold',
                  urgencyColor,
                )}
              >
                <div className="text-lg tabular leading-none">
                  {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                </div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  {daysLeft === 0 ? 'Exam day' : daysLeft === 1 ? 'day left' : 'days left'}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn-ghost btn-xs h-7 w-7 p-0"
                onClick={onEdit}
                title="Edit exam"
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                className="btn-ghost btn-xs h-7 w-7 p-0 text-muted hover:text-danger"
                onClick={() =>
                  confirmAction({
                    title: 'Delete this exam?',
                    message: `Are you sure you want to remove "${exam.title}"?`,
                    confirmLabel: 'Delete',
                    danger: true,
                    onConfirm: () => deleteExam(exam.id),
                  })
                }
                title="Delete exam"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Preparation checklist preview */}
        <div className="mt-3 border-t border-line/60 pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-accent" />
              Syllabus preparation
            </span>
            <span className="tabular text-muted">
              {prepCount} / {totalCount} topics ({prepProgress}%)
            </span>
          </div>

          <div className="mt-1.5">
            <ProgressBar value={prepProgress} tone="accent" />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-accent hover:underline flex items-center gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide checklist' : `View checklist (${totalCount} items)`}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {expanded && (
            <div className="mt-3 rounded-lg border border-line bg-surface/50 p-3 space-y-2 animate-fade-in text-xs">
              <div className="space-y-1.5">
                {exam.syllabus.length === 0 ? (
                  <p className="text-muted text-[11px] italic">No syllabus topics added yet.</p>
                ) : (
                  exam.syllabus.map((item) => {
                    const isChecked = exam.syllabusChecked.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 group hover:bg-elevated/40 p-1 rounded"
                      >
                        <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExamSyllabusItem(exam.id, item.id)}
                            className="rounded border-line text-accent focus:ring-accent"
                          />
                          <span className={cn('text-ink truncate', isChecked && 'line-through text-muted')}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger p-0.5"
                          onClick={() => removeExamSyllabusItem(exam.id, item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleAddSyllabus} className="flex gap-1.5 pt-2 border-t border-line/40">
                <input
                  type="text"
                  placeholder="Add topic or module..."
                  value={newSyllabusText}
                  onChange={(e) => setNewSyllabusText(e.target.value)}
                  className="input input-sm flex-1 text-xs py-1"
                />
                <button type="submit" className="btn-outline btn-xs gap-1">
                  <Plus size={12} /> Add
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------
   Add / Edit Exam Modal
------------------------------------------------------------------ */

function ExamDialog({ exam, onClose }: { exam: Exam | null; onClose: () => void }) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);

  const [title, setTitle] = useState(exam?.title ?? '');
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? '');
  const [date, setDate] = useState(exam?.date ?? todayISO());
  const [time, setTime] = useState<HHMM>(exam?.time ?? '09:30');
  const [durationMinutes, setDurationMinutes] = useState(String(exam?.durationMinutes ?? 180));
  const [venue, setVenue] = useState(exam?.venue ?? '');
  const [notes, setNotes] = useState(exam?.notes ?? '');

  // Auto-populate syllabus topics from subject if creating new exam and subject selected
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    if (!exam && newSubjectId) {
      const sub = data.subjects.find((s) => s.id === newSubjectId);
      if (sub && !title) {
        setTitle(`${sub.name} Examination`);
      }
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const payload = {
      title: title.trim(),
      subjectId: subjectId || null,
      date,
      time: time || null,
      durationMinutes: Math.max(0, Number(durationMinutes) || 0),
      venue: venue.trim(),
      notes: notes.trim(),
      syllabus: exam?.syllabus ?? [],
      syllabusChecked: exam?.syllabusChecked ?? [],
    };

    if (exam) {
      updateExam(exam.id, payload);
      toast({ kind: 'success', title: 'Exam updated' });
    } else {
      // Auto-import subject topics if any exist
      let syllabusItems: ExamSyllabusItem[] = [];
      if (subjectId) {
        const sub = data.subjects.find((s) => s.id === subjectId);
        if (sub && sub.topics.length > 0) {
          syllabusItems = sub.topics.map((t) => ({
            id: t.id,
            text: t.title,
            topicId: t.id,
          }));
        }
      }
      createExam({
        ...payload,
        syllabus: syllabusItems,
        syllabusChecked: [],
      });
      toast({
        kind: 'success',
        title: 'Exam scheduled',
        message: `${syllabusItems.length} topics imported into preparation checklist`,
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={exam ? 'Edit Exam' : 'Schedule Exam'}>
      <form onSubmit={submit} className="space-y-4 p-4">
        <div>
          <label className="block label">Exam Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. End Semester Exam - Core Java"
            required
            data-autofocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block label">Subject</label>
            <select
              className="input"
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="">No subject linked</option>
              {data.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block label">Exam Date *</label>
            <input
              type="date"
              className="input tabular"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block label">Start Time</label>
            <input
              type="time"
              className="input tabular"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block label">Duration (min)</label>
            <input
              type="number"
              min={10}
              max={600}
              className="input tabular"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <div>
            <label className="block label">Venue / Hall</label>
            <input
              className="input"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Room 204, Block A"
            />
          </div>
        </div>

        <div>
          <label className="block label">Instructions / Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bring scientific calculator, hall ticket, admit card..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {exam ? 'Save changes' : 'Schedule exam'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
