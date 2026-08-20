import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Flame, GripHorizontal, MapPin } from 'lucide-react';
import type { ClassSlot, ISODate, Task } from '@/types';
import { updateTask } from '@/store/actions';
import { useUiStore } from '@/store/useUiStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { formatHHMM12, hhmmToMinutes, minutesToHHMM, nowHHMM, todayISO, weekdayOf } from '@/utils/date';
import { cn } from '@/utils/misc';

const PX_PER_MIN = 1.1;
const SNAP = 15;

export interface StudyTimelineBlock {
  id: string;
  title: string;
  subjectId: string | null;
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
  minutes: number;
  method?: string | null;
  fromPomodoro: boolean;
}

/**
 * Vertical day planner. Class slots, time-blocked tasks, and completed study sessions /
 * Pomodoro focus rounds are displayed side-by-side on the timeline.
 */
export function DayTimeline({ date }: { date: ISODate }) {
  const data = useData();
  const index = useIndex();
  const openEditor = useUiStore((s) => s.openTaskEditor);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'resize'; start: number; end: number } | null>(
    null,
  );

  const slots = useMemo<ClassSlot[]>(() => {
    if (data.schedule.holidays.includes(date)) return [];
    const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
    if (!sem) return [];
    return sem.slots.filter((s) => s.day === weekdayOf(date));
  }, [data.schedule, date]);

  const timedTasks = useMemo(
    () => (index.tasks.get(date) ?? []).filter((t): t is Task & { start: string } => t.start !== null),
    [index, date],
  );
  const untimed = (index.tasks.get(date) ?? []).filter((t) => t.start === null);

  // Extract completed study sessions and Pomodoro focus rounds for this date
  const studyBlocks = useMemo<StudyTimelineBlock[]>(() => {
    const pomoRounds = (data.pomodoroLog ?? []).filter((p) => p.date === date && p.kind === 'focus');
    const sessions = (data.studySessions ?? []).filter((s) => s.date === date);

    const items: StudyTimelineBlock[] = [];

    // Add Pomodoro focus rounds (span exact startedAt to endedAt duration)
    pomoRounds.forEach((p) => {
      const dStart = new Date(p.startedAt);
      const dEnd = new Date(p.endedAt);
      let startMin = dStart.getHours() * 60 + dStart.getMinutes();
      let endMin = dEnd.getHours() * 60 + dEnd.getMinutes();

      if (isNaN(startMin) || isNaN(endMin) || endMin <= startMin) {
        if (isNaN(endMin)) endMin = 9 * 60 + p.minutes;
        startMin = Math.max(0, endMin - p.minutes);
      }

      items.push({
        id: p.id,
        title: p.label || 'Focus round',
        subjectId: p.subjectId,
        start: startMin,
        end: endMin,
        minutes: p.minutes,
        method: p.method,
        fromPomodoro: true,
      });
    });

    // Add manual study sessions that have a start time and are not already counted from Pomodoro
    sessions
      .filter((s) => !s.fromPomodoro && s.start !== null)
      .forEach((s) => {
        const startMin = hhmmToMinutes(s.start!);
        const endMin = s.end ? hhmmToMinutes(s.end) : startMin + s.minutes;
        items.push({
          id: s.id,
          title: s.topic || 'Study session',
          subjectId: s.subjectId,
          start: startMin,
          end: Math.max(startMin + 15, endMin),
          minutes: s.minutes,
          method: s.method,
          fromPomodoro: false,
        });
      });

    return items;
  }, [data.pomodoroLog, data.studySessions, date]);

  const untimedStudySessions = useMemo(() => {
    return (data.studySessions ?? []).filter((s) => s.date === date && !s.fromPomodoro && s.start === null);
  }, [data.studySessions, date]);

  const blocks = [
    ...slots.map((s) => ({ kind: 'class' as const, start: hhmmToMinutes(s.start), end: hhmmToMinutes(s.end), slot: s })),
    ...timedTasks.map((t) => ({
      kind: 'task' as const,
      start: hhmmToMinutes(t.start),
      end: t.end ? hhmmToMinutes(t.end) : hhmmToMinutes(t.start) + (t.estimatedMinutes ?? 45),
      task: t,
    })),
    ...studyBlocks.map((sb) => ({
      kind: 'study' as const,
      start: sb.start,
      end: sb.end,
      study: sb,
    })),
  ];

  const dayStart = Math.max(
    0,
    Math.min(hhmmToMinutes(data.settings.wakeTime), ...blocks.map((b) => b.start), 6 * 60) - 30,
  );
  const dayEnd = Math.min(1440, Math.max(22 * 60, ...blocks.map((b) => b.end)) + 30);
  const height = (dayEnd - dayStart) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m < dayEnd; m += 60) hours.push(m);

  const top = (min: number) => (min - dayStart) * PX_PER_MIN;
  const snap = (min: number) => Math.round(min / SNAP) * SNAP;

  const beginDrag = (task: Task & { start: string }, mode: 'move' | 'resize', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startMin = hhmmToMinutes(task.start);
    const endMin = task.end ? hhmmToMinutes(task.end) : startMin + (task.estimatedMinutes ?? 45);
    const originY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    let next = { start: startMin, end: endMin };

    const onMove = (ev: PointerEvent) => {
      const deltaMin = snap((ev.clientY - originY) / PX_PER_MIN);
      if (mode === 'move') {
        const length = endMin - startMin;
        const s = Math.max(0, Math.min(1440 - length, startMin + deltaMin));
        next = { start: s, end: s + length };
      } else {
        const end = Math.max(startMin + SNAP, Math.min(1440, endMin + deltaMin));
        next = { start: startMin, end };
      }
      setDrag({ id: task.id, mode, ...next });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (next.start !== startMin || next.end !== endMin) {
        updateTask(task.id, { start: minutesToHHMM(next.start), end: minutesToHHMM(next.end) });
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const nowMin = date === todayISO() ? hhmmToMinutes(nowHHMM()) : null;
  const hasClasses = slots.length > 0;

  if (blocks.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted">
        Nothing scheduled for this day.
        {untimed.length > 0 && ` ${untimed.length} task${untimed.length === 1 ? '' : 's'} without a time.`}
        {untimedStudySessions.length > 0 && ` ${untimedStudySessions.length} logged study session${untimedStudySessions.length === 1 ? '' : 's'}.`}
      </div>
    );
  }

  return (
    <div className="p-3">
      <div ref={gridRef} className="relative select-none" style={{ height }}>
        {hours.map((m) => (
          <div key={m} className="absolute inset-x-0 flex items-start gap-2" style={{ top: top(m) }}>
            <span className="w-11 shrink-0 -translate-y-1.5 text-right text-[10px] tabular text-faint">
              {formatHHMM12(minutesToHHMM(m))}
            </span>
            <span className="mt-0 h-px flex-1 bg-line" />
          </div>
        ))}

        {nowMin !== null && nowMin >= dayStart && nowMin <= dayEnd && (
          <div className="absolute inset-x-0 z-20 flex items-center gap-2" style={{ top: top(nowMin) }}>
            <span className="w-11 shrink-0 text-right text-[10px] font-semibold tabular text-danger">now</span>
            <span className="h-px flex-1 bg-danger" />
          </div>
        )}

        <div className="absolute inset-y-0 left-[52px] right-0">
          {/* Class Slots */}
          {slots.map((slot) => {
            const s = hhmmToMinutes(slot.start);
            const e = hhmmToMinutes(slot.end);
            const subject = data.subjects.find((sub) => sub.id === slot.subjectId);
            const color = slot.color ?? subject?.color ?? '#64748b';
            return (
              <div
                key={slot.id}
                className={cn('absolute overflow-hidden rounded-ctl border px-2 py-1', hasClasses ? 'left-0 w-[30%]' : 'left-0 w-[46%]')}
                style={{
                  top: top(s),
                  height: Math.max(18, (e - s) * PX_PER_MIN - 2),
                  borderColor: `${color}55`,
                  background: `${color}18`,
                }}
                title={`${slot.title || subject?.name || 'Class'} · ${formatHHMM12(slot.start)}–${formatHHMM12(slot.end)}`}
              >
                <p className="truncate text-[11px] font-medium text-ink">
                  {slot.title || subject?.name || 'Class'}
                </p>
                <p className="flex items-center gap-1 truncate text-[10px] text-muted">
                  {formatHHMM12(slot.start)}
                  {slot.room && (
                    <>
                      <MapPin size={9} /> {slot.room}
                    </>
                  )}
                </p>
              </div>
            );
          })}

          {/* Time-blocked Tasks */}
          {timedTasks.map((task) => {
            const live = drag?.id === task.id ? drag : null;
            const s = live ? live.start : hhmmToMinutes(task.start);
            const e = live
              ? live.end
              : task.end
                ? hhmmToMinutes(task.end)
                : hhmmToMinutes(task.start) + (task.estimatedMinutes ?? 45);
            const subject = data.subjects.find((sub) => sub.id === task.subjectId);
            const color = subject?.color ?? 'rgb(99 102 241)';
            const done = task.status === 'completed';
            return (
              <div
                key={task.id}
                className={cn(
                  'group absolute cursor-grab overflow-hidden rounded-ctl border px-2 py-1 transition-shadow active:cursor-grabbing',
                  hasClasses ? 'left-[32%] w-[33%]' : 'left-0 w-[48%]',
                  live && 'z-30 shadow-pop',
                  done && 'opacity-60',
                )}
                style={{
                  top: top(s),
                  height: Math.max(20, (e - s) * PX_PER_MIN - 2),
                  borderColor: `${color}66`,
                  background: `${color}1f`,
                }}
                onPointerDown={(ev) => beginDrag(task, 'move', ev)}
                onDoubleClick={() => openEditor(task.id)}
                title="Drag to move · drag the bottom edge to resize · double-click to edit"
              >
                <p className={cn('truncate text-[11px] font-medium text-ink', done && 'line-through')}>
                  {task.title}
                </p>
                <p className="truncate text-[10px] tabular text-muted">
                  {formatHHMM12(minutesToHHMM(s))}–{formatHHMM12(minutesToHHMM(e))}
                </p>
                <span
                  role="separator"
                  aria-label={`Resize ${task.title}`}
                  onPointerDown={(ev) => beginDrag(task, 'resize', ev)}
                  className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <GripHorizontal size={11} className="text-muted" />
                </span>
              </div>
            );
          })}

          {/* Completed Study Sessions & Pomodoro Focus Rounds */}
          {studyBlocks.map((sb) => {
            const subject = data.subjects.find((sub) => sub.id === sb.subjectId);
            const color = subject?.color ?? '#10b981';

            // Detect overlapping study blocks to position side-by-side
            const overlapping = studyBlocks.filter(
              (other) => Math.max(sb.start, other.start) < Math.min(sb.end, other.end),
            );
            const overlapCount = Math.max(1, overlapping.length);
            const subIndex = Math.max(0, overlapping.findIndex((o) => o.id === sb.id));

            const colBase = hasClasses ? 67 : 50;
            const totalWidth = hasClasses ? 31 : 48;
            const blockWidth = totalWidth / overlapCount;
            const leftPos = colBase + subIndex * blockWidth;

            return (
              <div
                key={sb.id}
                className="absolute overflow-hidden rounded-ctl border px-2 py-1 transition-all shadow-sm z-10"
                style={{
                  top: top(sb.start),
                  left: `${leftPos}%`,
                  width: `${blockWidth}%`,
                  height: Math.max(24, (sb.end - sb.start) * PX_PER_MIN - 2),
                  borderColor: `${color}88`,
                  background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
                }}
                title={`${sb.title} · ${sb.minutes} min logged (${sb.fromPomodoro ? 'Pomodoro Focus' : 'Study Session'})`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[11px] font-semibold text-ink flex items-center gap-1">
                    {sb.fromPomodoro ? <Flame size={11} className="text-amber-500 shrink-0" /> : <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />}
                    <span className="truncate">{sb.title}</span>
                  </p>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {sb.minutes}m
                  </span>
                </div>
                <p className="truncate text-[10px] tabular text-muted flex items-center gap-1">
                  {formatHHMM12(minutesToHHMM(sb.start))}–{formatHHMM12(minutesToHHMM(sb.end))}
                  {sb.method && (
                    <span className="capitalize opacity-80">• {sb.method.replace('_', ' ')}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {(untimed.length > 0 || untimedStudySessions.length > 0) && (
        <div className="mt-2 border-t border-line pt-2 text-[11px] text-muted space-y-1">
          {untimed.length > 0 && (
            <p>
              {untimed.length} task{untimed.length === 1 ? '' : 's'} without a time — give one a start time to place it on the timeline.
            </p>
          )}
          {untimedStudySessions.length > 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              {untimedStudySessions.length} additional study session{untimedStudySessions.length === 1 ? '' : 's'} logged today ({untimedStudySessions.reduce((acc, s) => acc + s.minutes, 0)} min total).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
