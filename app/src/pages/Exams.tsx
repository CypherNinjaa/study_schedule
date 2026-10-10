import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck,
  GraduationCap,
  MapPin,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Exam, ExamSyllabusItem, HHMM, ISODate, Topic } from '@/types';
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
                    const topicInfo = subject?.topics.find(
                      (t) => t.id === item.topicId || t.title.toLowerCase() === item.text.toLowerCase(),
                    );
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          {topicInfo?.module && (
                            <span className="text-[10px] text-muted/70 bg-elevated/70 border border-line/40 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                              {topicInfo.module}
                            </span>
                          )}
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger p-0.5"
                            onClick={() => removeExamSyllabusItem(exam.id, item.id)}
                            title="Remove item"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleAddSyllabus} className="flex gap-1.5 pt-2 border-t border-line/40">
                <input
                  type="text"
                  placeholder="Add custom topic or note..."
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

interface ModuleGroup {
  name: string;
  topics: Topic[];
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  className,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className={className}
    />
  );
}

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

  // Selected topics from subject for syllabus coverage
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    if (exam && exam.subjectId) {
      const sub = data.subjects.find((s) => s.id === exam.subjectId);
      if (sub) {
        exam.syllabus.forEach((item) => {
          if (item.topicId) {
            ids.add(item.topicId);
          } else {
            const match = sub.topics.find(
              (t) => t.title.toLowerCase() === item.text.toLowerCase(),
            );
            if (match) ids.add(match.id);
          }
        });
      }
    } else if (!exam && subjectId) {
      const sub = data.subjects.find((s) => s.id === subjectId);
      sub?.topics.forEach((t) => ids.add(t.id));
    }
    return ids;
  });

  const [topicSearch, setTopicSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  const selectedSubject = useMemo(
    () => (subjectId ? data.subjects.find((s) => s.id === subjectId) : null),
    [data.subjects, subjectId],
  );

  // Group topics by module
  const moduleGroups = useMemo<ModuleGroup[]>(() => {
    if (!selectedSubject || selectedSubject.topics.length === 0) return [];

    const map = new Map<string, Topic[]>();
    for (const topic of selectedSubject.topics) {
      const modName = topic.module?.trim() || 'General Topics';
      if (!map.has(modName)) {
        map.set(modName, []);
      }
      map.get(modName)!.push(topic);
    }

    return Array.from(map.entries()).map(([name, topics]) => ({
      name,
      topics,
    }));
  }, [selectedSubject]);

  // Filter module groups by search query
  const filteredGroups = useMemo(() => {
    if (!topicSearch.trim()) return moduleGroups;
    const q = topicSearch.trim().toLowerCase();

    return moduleGroups
      .map((group) => {
        const matchesGroupName = group.name.toLowerCase().includes(q);
        const matchingTopics = group.topics.filter(
          (t) => matchesGroupName || t.title.toLowerCase().includes(q),
        );
        return {
          name: group.name,
          topics: matchingTopics,
        };
      })
      .filter((group) => group.topics.length > 0);
  }, [moduleGroups, topicSearch]);

  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const sub = data.subjects.find((s) => s.id === newSubjectId);
    if (!exam && newSubjectId) {
      if (sub && !title) {
        setTitle(`${sub.name} Examination`);
      }
    }
    // Select all topics of the new subject by default
    if (sub && sub.topics.length > 0) {
      setSelectedTopicIds(new Set(sub.topics.map((t) => t.id)));
    } else {
      setSelectedTopicIds(new Set());
    }
    setTopicSearch('');
  };

  const handleSelectAll = () => {
    if (!selectedSubject) return;
    setSelectedTopicIds(new Set(selectedSubject.topics.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedTopicIds(new Set());
  };

  const toggleGroup = (group: ModuleGroup) => {
    const allSelected = group.topics.every((t) => selectedTopicIds.has(t.id));
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        group.topics.forEach((t) => next.delete(t.id));
      } else {
        group.topics.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const toggleCollapseModule = (moduleName: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    let syllabusItems: ExamSyllabusItem[] = [];
    let updatedChecked: string[] = [];

    if (subjectId && selectedSubject) {
      const selectedTopicsList = selectedSubject.topics.filter((t) =>
        selectedTopicIds.has(t.id),
      );

      if (exam) {
        // Map existing syllabus items to preserve original ID and checked status
        const existingTopicMap = new Map<string, ExamSyllabusItem>();
        exam.syllabus.forEach((item) => {
          if (item.topicId) existingTopicMap.set(item.topicId, item);
          else existingTopicMap.set(item.text.toLowerCase(), item);
        });

        syllabusItems = selectedTopicsList.map((t) => {
          const existing =
            existingTopicMap.get(t.id) || existingTopicMap.get(t.title.toLowerCase());
          if (existing) return existing;
          return {
            id: t.id,
            text: t.title,
            topicId: t.id,
          };
        });

        // Also preserve custom items manually added to this exam that aren't subject topics
        const subjectTopicIds = new Set(selectedSubject.topics.map((t) => t.id));
        const subjectTopicTitles = new Set(
          selectedSubject.topics.map((t) => t.title.toLowerCase()),
        );
        const customItems = exam.syllabus.filter(
          (item) =>
            (!item.topicId && !subjectTopicTitles.has(item.text.toLowerCase())) ||
            (item.topicId && !subjectTopicIds.has(item.topicId)),
        );
        syllabusItems.push(...customItems);

        const validIds = new Set(syllabusItems.map((item) => item.id));
        updatedChecked = exam.syllabusChecked.filter((id) => validIds.has(id));
      } else {
        syllabusItems = selectedTopicsList.map((t) => ({
          id: t.id,
          text: t.title,
          topicId: t.id,
        }));
        updatedChecked = [];
      }
    } else {
      syllabusItems = exam?.syllabus ?? [];
      updatedChecked = exam?.syllabusChecked ?? [];
    }

    const payload = {
      title: title.trim(),
      subjectId: subjectId || null,
      date,
      time: time || null,
      durationMinutes: Math.max(0, Number(durationMinutes) || 0),
      venue: venue.trim(),
      notes: notes.trim(),
      syllabus: syllabusItems,
      syllabusChecked: updatedChecked,
    };

    if (exam) {
      updateExam(exam.id, payload);
      toast({
        kind: 'success',
        title: 'Exam updated',
        message:
          syllabusItems.length > 0
            ? `${syllabusItems.length} topics in preparation checklist`
            : undefined,
      });
    } else {
      createExam(payload);
      toast({
        kind: 'success',
        title: 'Exam scheduled',
        message:
          syllabusItems.length > 0
            ? `${syllabusItems.length} topics included in preparation checklist`
            : 'Scheduled with empty preparation checklist',
      });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={exam ? 'Edit Exam' : 'Schedule Exam'} size="lg">
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

        {/* Topic and Module syllabus selector when subject is chosen */}
        {selectedSubject && (
          <div className="rounded-card border border-line bg-surface/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-accent shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-ink">Exam Syllabus & Topics</span>
                  <span className="hidden sm:inline ml-2 text-[11px] text-muted">
                    Choose which modules and topics are in this exam
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="chip text-[11px] font-medium py-0.5 px-2">
                  {selectedTopicIds.size} of {selectedSubject.topics.length} selected
                </span>
                <button
                  type="button"
                  className="btn-ghost btn-xs text-xs px-2 py-0.5"
                  onClick={handleSelectAll}
                  title="Select all topics"
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-xs text-xs px-2 py-0.5 text-muted hover:text-danger"
                  onClick={handleDeselectAll}
                  title="Clear all selected topics"
                >
                  Clear all
                </button>
              </div>
            </div>

            {selectedSubject.topics.length === 0 ? (
              <p className="text-xs text-muted italic p-2 rounded bg-elevated/40 border border-line/50">
                This subject has no topics in its syllabus yet. You can schedule the exam and add topics directly to the checklist later.
              </p>
            ) : (
              <>
                {selectedSubject.topics.length > 5 && (
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                    />
                    <input
                      type="text"
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      placeholder="Search topics or modules..."
                      className="input input-sm pl-7 text-xs h-8 w-full"
                    />
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-line/30">
                  {filteredGroups.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4 italic">
                      No topics match &ldquo;{topicSearch}&rdquo;
                    </p>
                  ) : (
                    filteredGroups.map((group) => {
                      const selectedInGroup = group.topics.filter((t) =>
                        selectedTopicIds.has(t.id),
                      ).length;
                      const isAllGroupSelected =
                        group.topics.length > 0 && selectedInGroup === group.topics.length;
                      const isGroupPartiallySelected =
                        selectedInGroup > 0 && !isAllGroupSelected;
                      const isCollapsed = collapsedModules.has(group.name);

                      return (
                        <div key={group.name} className="pt-2 first:pt-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-elevated/60 border border-line/60">
                            <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 select-none">
                              <IndeterminateCheckbox
                                checked={isAllGroupSelected}
                                indeterminate={isGroupPartiallySelected}
                                onChange={() => toggleGroup(group)}
                                className="rounded border-line text-accent focus:ring-accent"
                              />
                              <span className="font-semibold text-xs text-ink truncate">
                                {group.name}
                              </span>
                            </label>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] tabular px-1.5 py-0.5 rounded bg-surface border border-line/50 text-muted">
                                {selectedInGroup}/{group.topics.length}
                              </span>
                              <button
                                type="button"
                                className="btn-ghost btn-xs h-6 w-6 p-0 text-muted hover:text-ink"
                                onClick={() => toggleCollapseModule(group.name)}
                                title={isCollapsed ? 'Expand module' : 'Collapse module'}
                              >
                                {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                              </button>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="pl-6 pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1 animate-fade-in">
                              {group.topics.map((t) => {
                                const isChecked = selectedTopicIds.has(t.id);
                                return (
                                  <label
                                    key={t.id}
                                    className={cn(
                                      'flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs transition-colors hover:bg-elevated/50',
                                      isChecked ? 'text-ink font-medium bg-elevated/20' : 'text-muted',
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleTopic(t.id)}
                                      className="rounded border-line text-accent focus:ring-accent"
                                    />
                                    <span className="truncate" title={t.title}>
                                      {t.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedTopicIds.size === 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>0 topics selected. The exam will be scheduled without initial checklist items.</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
