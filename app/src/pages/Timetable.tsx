import { useMemo, useState } from 'react';
import { CalendarOff, MapPin, Plus, Trash2, User } from 'lucide-react';
import type { ClassSlot, Weekday } from '@/types';
import {
  addClassSlot,
  createSemester,
  deleteClassSlot,
  deleteSemester,
  setActiveSemester,
  toggleHoliday,
  updateClassSlot,
  updateSemester,
} from '@/store/actions';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useData } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader } from '@/components/ui/Primitives';
import { confirmAction } from '@/utils/confirm';
import { Modal } from '@/components/ui/Modal';
import { addDaysISO, formatHHMM12, formatMinutes, hhmmToMinutes, todayISO, weekdayName } from '@/utils/date';

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const TYPES: ClassSlot['type'][] = ['lecture', 'lab', 'tutorial', 'other'];

export function Timetable() {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const [editing, setEditing] = useState<ClassSlot | null>(null);
  const [creatingDay, setCreatingDay] = useState<Weekday | null>(null);
  const [semesterDialog, setSemesterDialog] = useState(false);

  const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
  const byDay = useMemo(() => {
    const map = new Map<Weekday, ClassSlot[]>();
    for (const day of DAYS) map.set(day, []);
    for (const slot of sem?.slots ?? []) map.get(slot.day)?.push(slot);
    for (const list of map.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [sem]);

  const weeklyMinutes = (sem?.slots ?? []).reduce((a, s) => a + hhmmToMinutes(s.end) - hhmmToMinutes(s.start), 0);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Timetable"
        subtitle={
          sem
            ? `${sem.name} · ${sem.slots.length} classes · ${formatMinutes(weeklyMinutes)} a week`
            : 'No semester selected'
        }
        action={
          <>
            <select
              className="input h-8 w-auto text-sm"
              value={data.schedule.activeSemesterId}
              onChange={(e) => setActiveSemester(e.target.value)}
              aria-label="Active semester"
            >
              {data.schedule.semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => setSemesterDialog(true)}>
              <Plus size={14} /> Semester
            </button>
          </>
        }
      />

      {sem && (
        <Card>
          <CardHeader title="Semester details" subtitle="Everything here is yours to change" />
          <div className="grid gap-3 p-4 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="label">Name</span>
              <input
                className="input"
                value={sem.name}
                onChange={(e) => updateSemester(sem.id, { name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Starts</span>
              <input
                type="date"
                className="input"
                value={sem.startDate}
                onChange={(e) => updateSemester(sem.id, { startDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">Ends</span>
              <input
                type="date"
                className="input"
                value={sem.endDate}
                onChange={(e) => updateSemester(sem.id, { endDate: e.target.value })}
              />
            </label>
          </div>
          {data.schedule.semesters.length > 1 && (
            <div className="border-t border-line px-4 py-3">
              <button
                type="button"
                className="btn-ghost btn-sm gap-1.5 text-danger hover:bg-danger/10"
                onClick={() =>
                  confirmAction({
                    title: `Delete "${sem.name}"?`,
                    message: `The semester and its ${sem.slots.length} class slots will be removed. Study sessions and tasks are not touched. This cannot be undone.`,
                    confirmLabel: 'Delete semester',
                    danger: true,
                    onConfirm: () => {
                      deleteSemester(sem.id);
                      toast({ kind: 'info', title: 'Semester deleted' });
                    },
                  })
                }
              >
                <Trash2 size={14} /> Delete this semester
              </button>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((day) => {
          const slots = byDay.get(day) ?? [];
          const dayMinutes = slots.reduce((a, s) => a + hhmmToMinutes(s.end) - hhmmToMinutes(s.start), 0);
          return (
            <Card key={day}>
              <CardHeader
                title={weekdayName(day)}
                subtitle={slots.length === 0 ? 'No classes' : `${slots.length} · ${formatMinutes(dayMinutes, { short: true })}`}
                action={
                  <button
                    type="button"
                    className="btn-icon h-7 w-7"
                    aria-label={`Add a class on ${weekdayName(day)}`}
                    onClick={() => setCreatingDay(day)}
                  >
                    <Plus size={15} />
                  </button>
                }
              />
              {slots.length === 0 ? (
                <button
                  type="button"
                  className="w-full px-4 py-6 text-center text-xs text-muted transition-colors hover:bg-elevated"
                  onClick={() => setCreatingDay(day)}
                >
                  Add a class
                </button>
              ) : (
                <ul className="divide-y divide-line">
                  {slots.map((slot) => {
                    const subject = data.subjects.find((s) => s.id === slot.subjectId);
                    const color = slot.color ?? subject?.color ?? '#64748b';
                    return (
                      <li key={slot.id} className="group flex items-center gap-3 px-4 py-2.5">
                        <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: color }} />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setEditing(slot)}
                        >
                          <p className="truncate text-sm text-ink">{slot.title || subject?.name || 'Class'}</p>
                          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                            <span className="tabular">
                              {formatHHMM12(slot.start)}–{formatHHMM12(slot.end)}
                            </span>
                            {slot.room && (
                              <span className="flex items-center gap-0.5">
                                <MapPin size={9} /> {slot.room}
                              </span>
                            )}
                            {slot.teacher && (
                              <span className="flex items-center gap-0.5 truncate">
                                <User size={9} /> {slot.teacher}
                              </span>
                            )}
                            {slot.type !== 'lecture' && <span className="text-accent">{slot.type}</span>}
                          </p>
                        </button>
                        <button
                          type="button"
                          className="btn-icon h-7 w-7 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
                          aria-label={`Delete ${slot.title || 'class'}`}
                          onClick={() =>
                            confirmAction({
                              title: 'Delete this class?',
                              message: `${slot.title || subject?.name || 'The class'} on ${weekdayName(day)} at ${formatHHMM12(slot.start)} will be removed from the timetable.`,
                              confirmLabel: 'Delete',
                              danger: true,
                              onConfirm: () => deleteClassSlot(slot.id),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <HolidayCard />

      {(editing || creatingDay !== null) && (
        <SlotDialog
          slot={editing}
          day={creatingDay ?? 1}
          onClose={() => {
            setEditing(null);
            setCreatingDay(null);
          }}
        />
      )}

      {semesterDialog && <SemesterDialog onClose={() => setSemesterDialog(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HolidayCard() {
  const data = useData();
  const today = todayISO();
  const [date, setDate] = useState(today);

  const upcoming = data.schedule.holidays
    .filter((h) => h >= addDaysISO(today, -30))
    .sort()
    .slice(0, 24);

  const add = () => {
    if (!date || data.schedule.holidays.includes(date)) return;
    toggleHoliday(date);
  };

  return (
    <Card>
      <CardHeader
        title="Holidays and days off"
        subtitle="Classes are not counted on these days, so your score isn't punished for them"
      />
      <div className="flex flex-wrap items-end gap-3 p-4">
        <label className="block">
          <span className="label">Date</span>
          <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button type="button" className="btn-outline btn-sm gap-1.5" onClick={add}>
          <CalendarOff size={14} /> Mark as a day off
        </button>
      </div>
      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-line p-4">
          {upcoming.map((h) => (
            <button
              key={h}
              type="button"
              className="chip gap-1 transition-colors hover:bg-danger/10 hover:text-danger"
              title="Click to remove"
              onClick={() => toggleHoliday(h)}
            >
              {h} ×
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function SlotDialog({ slot, day, onClose }: { slot: ClassSlot | null; day: Weekday; onClose: () => void }) {
  const data = useData();
  const [draft, setDraft] = useState({
    day: slot?.day ?? day,
    start: slot?.start ?? '09:00',
    end: slot?.end ?? '10:00',
    subjectId: slot?.subjectId ?? '',
    title: slot?.title ?? '',
    teacher: slot?.teacher ?? '',
    room: slot?.room ?? data.profile.room,
    type: slot?.type ?? ('lecture' as ClassSlot['type']),
  });

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const valid = hhmmToMinutes(draft.end) > hhmmToMinutes(draft.start);

  const submit = () => {
    if (!valid) return;
    const payload = {
      day: draft.day,
      start: draft.start,
      end: draft.end,
      subjectId: draft.subjectId || null,
      title: draft.title.trim(),
      teacher: draft.teacher.trim(),
      room: draft.room.trim(),
      type: draft.type,
    };
    if (slot) updateClassSlot(slot.id, payload);
    else addClassSlot(payload);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={slot ? 'Edit class' : 'Add a class'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!valid}>
            {slot ? 'Save changes' : 'Add class'}
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
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Day</span>
            <select className="input" value={draft.day} onChange={(e) => set('day', Number(e.target.value) as Weekday)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </select>
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
        {!valid && <p className="text-xs text-danger">The end time needs to be after the start time.</p>}

        <label className="block">
          <span className="label">Subject</span>
          <select
            className="input"
            value={draft.subjectId}
            onChange={(e) => {
              const sub = data.subjects.find((s) => s.id === e.target.value);
              setDraft((d) => ({
                ...d,
                subjectId: e.target.value,
                teacher: d.teacher || sub?.teacher || '',
              }));
            }}
          >
            <option value="">No subject (use a label)</option>
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
          <span className="label">Label {draft.subjectId && '(optional)'}</span>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder={draft.subjectId ? 'Overrides the subject name' : 'e.g. Library slot'}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Teacher</span>
            <input className="input" value={draft.teacher} onChange={(e) => set('teacher', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Room</span>
            <input className="input" value={draft.room} onChange={(e) => set('room', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select className="input" value={draft.type} onChange={(e) => set('type', e.target.value as ClassSlot['type'])}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>
    </Modal>
  );
}

function SemesterDialog({ onClose }: { onClose: () => void }) {
  const today = todayISO();
  const [name, setName] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDaysISO(today, 150));

  return (
    <Modal
      open
      onClose={onClose}
      title="New semester"
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!name.trim()}
            onClick={() => {
              createSemester(name, start, end);
              onClose();
            }}
          >
            Create
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="BCA Semester VI"
            data-autofocus
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Starts</span>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Ends</span>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          A new semester starts with an empty timetable and becomes the active one. Your existing semesters stay
          exactly as they are.
        </p>
      </div>
    </Modal>
  );
}
