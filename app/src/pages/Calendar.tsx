import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { CalendarEvent, ISODate } from '@/types';
import { createEvent, deleteEvent, updateEvent } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, Segmented } from '@/components/ui/Primitives';
import { confirmAction } from '@/utils/confirm';
import { Modal } from '@/components/ui/Modal';
import { DayTimeline } from '@/components/planner/DayTimeline';
import {
  addDaysISO,
  endOfMonthISO,
  formatDateLong,
  formatHHMM12,
  monthName,
  rangeISO,
  relativeDayLabel,
  startOfMonthISO,
  startOfWeekISO,
  todayISO,
  weekdayName,
  weekdayOf,
} from '@/utils/date';
import { cn } from '@/utils/misc';

type View = 'month' | 'week' | 'day';

const VIEWS = [
  { value: 'month' as const, label: 'Month' },
  { value: 'week' as const, label: 'Week' },
  { value: 'day' as const, label: 'Day' },
];

const KIND_TONE: Record<CalendarEvent['kind'], string> = {
  exam: 'var(--c-danger)',
  deadline: 'var(--c-warn)',
  event: 'var(--accent)',
  holiday: 'var(--c-ok)',
};

export function Calendar() {
  const data = useData();
  const activeDate = useDataStore((s) => s.activeDate);
  const setActiveDate = useDataStore((s) => s.setActiveDate);
  const [view, setView] = useState<View>('month');
  const [eventDialog, setEventDialog] = useState<{ event: CalendarEvent | null; date: ISODate } | null>(null);
  const today = todayISO();
  const weekStartsOn = data.settings.weekStartsOn;

  const shift = (dir: 1 | -1) => {
    if (view === 'day') setActiveDate(addDaysISO(activeDate, dir));
    else if (view === 'week') setActiveDate(addDaysISO(activeDate, dir * 7));
    else {
      const first = startOfMonthISO(activeDate);
      setActiveDate(dir === 1 ? addDaysISO(endOfMonthISO(first), 1) : addDaysISO(first, -1));
    }
  };

  const heading =
    view === 'day'
      ? formatDateLong(activeDate)
      : view === 'week'
        ? (() => {
            const from = startOfWeekISO(activeDate, weekStartsOn);
            return `${formatDateLong(from)} – ${formatDateLong(addDaysISO(from, 6))}`;
          })()
        : `${monthName(Number(activeDate.slice(5, 7)) - 1)} ${activeDate.slice(0, 4)}`;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Calendar"
        subtitle={heading}
        action={
          <>
            <button type="button" className="btn-icon h-8 w-8" aria-label="Previous" onClick={() => shift(-1)}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="btn-outline btn-sm" onClick={() => setActiveDate(today)}>
              Today
            </button>
            <button type="button" className="btn-icon h-8 w-8" aria-label="Next" onClick={() => shift(1)}>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn-primary btn-sm gap-1.5"
              onClick={() => setEventDialog({ event: null, date: activeDate })}
            >
              <Plus size={15} /> Event
            </button>
          </>
        }
      />

      <Segmented value={view} onChange={setView} options={VIEWS} />

      {view === 'month' && (
        <MonthGrid
          anchor={activeDate}
          today={today}
          weekStartsOn={weekStartsOn}
          onPick={(d) => {
            setActiveDate(d);
            setView('day');
          }}
        />
      )}
      {view === 'week' && <WeekGrid anchor={activeDate} today={today} weekStartsOn={weekStartsOn} onPick={setActiveDate} />}
      {view === 'day' && <DayView date={activeDate} onAddEvent={() => setEventDialog({ event: null, date: activeDate })} />}

      <UpcomingCard onEdit={(e) => setEventDialog({ event: e, date: e.date })} />

      {eventDialog && (
        <EventDialog event={eventDialog.event} date={eventDialog.date} onClose={() => setEventDialog(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Everything happening on one date, gathered from tasks, classes, events and exams. */
function useDayEntries(date: ISODate) {
  const data = useData();
  const index = useIndex();
  return useMemo(() => {
    const isHoliday = data.schedule.holidays.includes(date);
    const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
    const classes = isHoliday ? [] : (sem?.slots.filter((s) => s.day === weekdayOf(date)) ?? []);
    const tasks = index.tasks.get(date) ?? [];
    const events = data.events.filter((e) => e.date === date);
    const exams = data.subjects.filter((s) => !s.archived && s.examDate === date);
    return { isHoliday, classes, tasks, events, exams };
  }, [data, index, date]);
}

function MonthGrid({
  anchor,
  today,
  weekStartsOn,
  onPick,
}: {
  anchor: ISODate;
  today: ISODate;
  weekStartsOn: 0 | 1;
  onPick: (d: ISODate) => void;
}) {
  const data = useData();
  const index = useIndex();

  const { days, monthKey } = useMemo(() => {
    const first = startOfMonthISO(anchor);
    const gridStart = startOfWeekISO(first, weekStartsOn);
    const last = endOfMonthISO(anchor);
    let gridEnd = addDaysISO(startOfWeekISO(last, weekStartsOn), 6);
    // Always render whole weeks; pad to 6 rows so the grid height doesn't jump.
    while (rangeISO(gridStart, gridEnd).length < 42) gridEnd = addDaysISO(gridEnd, 7);
    return { days: rangeISO(gridStart, gridEnd), monthKey: anchor.slice(0, 7) };
  }, [anchor, weekStartsOn]);

  const eventsByDate = useMemo(() => {
    const map = new Map<ISODate, CalendarEvent[]>();
    for (const e of data.events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [data.events]);

  const examsByDate = useMemo(() => {
    const map = new Map<ISODate, string[]>();
    for (const s of data.subjects) {
      if (s.archived || !s.examDate) continue;
      const list = map.get(s.examDate);
      if (list) list.push(s.code);
      else map.set(s.examDate, [s.code]);
    }
    return map;
  }, [data.subjects]);

  const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
  const classCount = (d: ISODate) =>
    data.schedule.holidays.includes(d) ? 0 : (sem?.slots.filter((s) => s.day === weekdayOf(d)).length ?? 0);

  const headers = [0, 1, 2, 3, 4, 5, 6].map((i) => weekdayName((i + weekStartsOn) % 7, true));

  return (
    <Card>
      <div className="grid grid-cols-7 border-b border-line">
        {headers.map((h) => (
          <div key={h} className="px-2 py-2 text-center text-[11px] font-medium text-muted">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.slice(0, 7) === monthKey;
          const isToday = d === today;
          const tasks = index.tasks.get(d) ?? [];
          const open = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped').length;
          const done = tasks.filter((t) => t.status === 'completed').length;
          const events = eventsByDate.get(d) ?? [];
          const exams = examsByDate.get(d) ?? [];
          const classes = classCount(d);
          const holiday = data.schedule.holidays.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                'min-h-[92px] border-b border-r border-line p-1.5 text-left align-top transition-colors last:border-r-0 hover:bg-elevated',
                !inMonth && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular',
                  isToday ? 'bg-accent font-medium text-white' : 'text-muted',
                )}
              >
                {Number(d.slice(8, 10))}
              </span>
              <div className="mt-1 space-y-0.5">
                {exams.map((code) => (
                  <p key={code} className="truncate rounded-sm bg-danger/12 px-1 text-[10px] text-danger">
                    Exam · {code}
                  </p>
                ))}
                {events.slice(0, 2).map((e) => (
                  <p
                    key={e.id}
                    className="truncate rounded-sm px-1 text-[10px]"
                    style={{ background: `rgb(${KIND_TONE[e.kind]} / 0.12)`, color: `rgb(${KIND_TONE[e.kind]})` }}
                  >
                    {e.title}
                  </p>
                ))}
                {events.length > 2 && <p className="px-1 text-[10px] text-faint">+{events.length - 2} more</p>}
                {holiday && <p className="truncate px-1 text-[10px] text-ok">Day off</p>}
                {classes > 0 && <p className="px-1 text-[10px] text-muted">{classes} classes</p>}
                {open > 0 && <p className="px-1 text-[10px] text-warn">{open} to do</p>}
                {open === 0 && done > 0 && <p className="px-1 text-[10px] text-ok">all done</p>}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function WeekGrid({
  anchor,
  today,
  weekStartsOn,
  onPick,
}: {
  anchor: ISODate;
  today: ISODate;
  weekStartsOn: 0 | 1;
  onPick: (d: ISODate) => void;
}) {
  const from = startOfWeekISO(anchor, weekStartsOn);
  const days = rangeISO(from, addDaysISO(from, 6));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {days.map((d) => (
        <WeekDayCard key={d} date={d} today={today} active={d === anchor} onPick={onPick} />
      ))}
    </div>
  );
}

function WeekDayCard({
  date,
  today,
  active,
  onPick,
}: {
  date: ISODate;
  today: ISODate;
  active: boolean;
  onPick: (d: ISODate) => void;
}) {
  const { isHoliday, classes, tasks, events, exams } = useDayEntries(date);
  const open = tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
  const done = tasks.length - open.length;

  return (
    <Card className={cn(active && 'ring-1 ring-accent')}>
      <button type="button" className="w-full text-left" onClick={() => onPick(date)}>
        <div className="flex items-baseline justify-between gap-2 border-b border-line px-3 py-2">
          <span className={cn('text-sm', date === today ? 'font-medium text-accent' : 'text-ink')}>
            {relativeDayLabel(date, today)}
          </span>
          <span className="text-[11px] text-muted">{weekdayName(weekdayOf(date), true)}</span>
        </div>
      </button>
      <div className="space-y-1 p-3 text-[11px]">
        {isHoliday && <p className="text-ok">Day off — no classes counted</p>}
        {exams.map((s) => (
          <p key={s.id} className="text-danger">
            Exam · {s.code}
          </p>
        ))}
        {events.map((e) => (
          <p key={e.id} style={{ color: `rgb(${KIND_TONE[e.kind]})` }} className="truncate">
            {e.start ? `${formatHHMM12(e.start)} · ` : ''}
            {e.title}
          </p>
        ))}
        {classes.length > 0 && (
          <p className="text-muted">
            {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {formatHHMM12(classes[0].start)} onwards
          </p>
        )}
        {open.length > 0 ? (
          <ul className="space-y-0.5">
            {open.slice(0, 4).map((t) => (
              <li key={t.id} className="truncate text-ink">
                · {t.title}
              </li>
            ))}
            {open.length > 4 && <li className="text-faint">+{open.length - 4} more</li>}
          </ul>
        ) : (
          <p className="text-muted">{done > 0 ? `${done} done, nothing left` : 'Nothing planned'}</p>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DayView({ date, onAddEvent }: { date: ISODate; onAddEvent: () => void }) {
  const { isHoliday, events, exams } = useDayEntries(date);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader
          title={formatDateLong(date)}
          subtitle={isHoliday ? 'Marked as a day off' : 'Classes and timed tasks'}
          action={
            <button type="button" className="btn-outline btn-sm gap-1.5" onClick={() => openQuickAdd(date)}>
              <Plus size={14} /> Task
            </button>
          }
        />
        <div className="p-3">
          <DayTimeline date={date} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="On this day"
          subtitle="Exams and events"
          action={
            <button type="button" className="btn-icon h-7 w-7" aria-label="Add an event" onClick={onAddEvent}>
              <Plus size={15} />
            </button>
          }
        />
        {exams.length === 0 && events.length === 0 ? (
          <p className="p-4 text-sm text-muted">Nothing marked for this day.</p>
        ) : (
          <ul className="divide-y divide-line">
            {exams.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: s.color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{s.name} exam</p>
                  <p className="text-[11px] text-danger">{s.code}</p>
                </div>
              </li>
            ))}
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EventRow({
  event: e,
  showDate = false,
  onEdit,
}: {
  event: CalendarEvent;
  showDate?: boolean;
  onEdit?: (e: CalendarEvent) => void;
}) {
  return (
    <li className="group flex items-center gap-2 px-4 py-2.5">
      <span
        className="h-7 w-1 shrink-0 rounded-full"
        style={{ background: e.color ?? `rgb(${KIND_TONE[e.kind]})` }}
      />
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        disabled={!onEdit}
        onClick={() => onEdit?.(e)}
      >
        <p className="truncate text-sm text-ink">{e.title}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
          <span style={{ color: `rgb(${KIND_TONE[e.kind]})` }}>{e.kind}</span>
          {showDate && <span className="tabular">{relativeDayLabel(e.date)}</span>}
          {e.start && (
            <span className="tabular">
              {formatHHMM12(e.start)}
              {e.end ? `–${formatHHMM12(e.end)}` : ''}
            </span>
          )}
        </p>
      </button>
      <button
        type="button"
        className="btn-icon h-7 w-7 text-danger opacity-0 focus:opacity-100 group-hover:opacity-100"
        aria-label={`Delete ${e.title}`}
        onClick={() =>
          confirmAction({
            title: `Delete "${e.title}"?`,
            message: 'The event will be removed from your calendar. This cannot be undone.',
            confirmLabel: 'Delete event',
            danger: true,
            onConfirm: () => deleteEvent(e.id),
          })
        }
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function UpcomingCard({ onEdit }: { onEdit: (e: CalendarEvent) => void }) {
  const data = useData();
  const today = todayISO();
  const upcoming = data.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader title="Coming up" subtitle="The next few things on your calendar" />
      {upcoming.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted">
          <CalendarDays size={16} /> Nothing scheduled yet.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((e) => (
            <EventRow key={e.id} event={e} showDate onEdit={onEdit} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const KINDS: CalendarEvent['kind'][] = ['event', 'exam', 'deadline', 'holiday'];

function EventDialog({
  event,
  date,
  onClose,
}: {
  event: CalendarEvent | null;
  date: ISODate;
  onClose: () => void;
}) {
  const data = useData();
  const [title, setTitle] = useState(event?.title ?? '');
  const [when, setWhen] = useState(event?.date ?? date);
  const [start, setStart] = useState(event?.start ?? '');
  const [end, setEnd] = useState(event?.end ?? '');
  const [kind, setKind] = useState<CalendarEvent['kind']>(event?.kind ?? 'event');
  const [subjectId, setSubjectId] = useState(event?.subjectId ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload = {
      title: trimmed,
      date: when,
      start: start || null,
      end: end || null,
      kind,
      subjectId: subjectId || null,
      notes,
    };
    if (event) updateEvent(event.id, payload);
    else createEvent(payload);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!title.trim()}>
            {event ? 'Save changes' : 'Add event'}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="DBMS internal exam"
            data-autofocus
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Kind</span>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as CalendarEvent['kind'])}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Starts (optional)</span>
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Ends (optional)</span>
            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className="label">Subject (optional)</span>
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
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
          <span className="label">Notes</span>
          <textarea
            className="input min-h-[56px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Syllabus covered, room number, anything useful"
          />
        </label>
      </form>
    </Modal>
  );
}




