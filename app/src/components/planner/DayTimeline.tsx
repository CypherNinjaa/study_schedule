import { useMemo, useRef, useState } from 'react';
import { GripHorizontal, MapPin } from 'lucide-react';
import type { ClassSlot, ISODate, Task } from '@/types';
import { updateTask } from '@/store/actions';
import { useUiStore } from '@/store/useUiStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { formatHHMM12, hhmmToMinutes, minutesToHHMM, nowHHMM, todayISO, weekdayOf } from '@/utils/date';
import { cn } from '@/utils/misc';

const PX_PER_MIN = 1.1;
const SNAP = 15;

/**
 * Vertical day planner. Class slots are rendered from the timetable and are
 * read-only here; time-blocked tasks can be dragged to move and resized from
 * the bottom edge. Everything snaps to 15 minutes.
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

  const blocks = [
    ...slots.map((s) => ({ kind: 'class' as const, start: hhmmToMinutes(s.start), end: hhmmToMinutes(s.end), slot: s })),
    ...timedTasks.map((t) => ({
      kind: 'task' as const,
      start: hhmmToMinutes(t.start),
      end: t.end ? hhmmToMinutes(t.end) : hhmmToMinutes(t.start) + (t.estimatedMinutes ?? 45),
      task: t,
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

  if (blocks.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted">
        Nothing scheduled for this day.
        {untimed.length > 0 && ` ${untimed.length} task${untimed.length === 1 ? '' : 's'} without a time.`}
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
          {slots.map((slot) => {
            const s = hhmmToMinutes(slot.start);
            const e = hhmmToMinutes(slot.end);
            const subject = data.subjects.find((sub) => sub.id === slot.subjectId);
            const color = slot.color ?? subject?.color ?? '#64748b';
            return (
              <div
                key={slot.id}
                className="absolute left-0 w-[46%] overflow-hidden rounded-ctl border px-2 py-1"
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
                  'group absolute right-0 w-[50%] cursor-grab overflow-hidden rounded-ctl border px-2 py-1 transition-shadow active:cursor-grabbing',
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
        </div>
      </div>

      {untimed.length > 0 && (
        <p className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
          {untimed.length} task{untimed.length === 1 ? '' : 's'} without a time — give one a start time to place it
          on the timeline.
        </p>
      )}
    </div>
  );
}
