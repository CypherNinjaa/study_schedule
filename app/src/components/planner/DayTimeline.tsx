import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  GripHorizontal,
  MapPin,
  Pencil,
} from 'lucide-react';
import type { ClassSlot, ISODate, Task } from '@/types';
import { setTaskStatus, updateTask } from '@/store/actions';
import { useUiStore } from '@/store/useUiStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import {
  formatHHMM12,
  formatMinutes,
  hhmmToMinutes,
  minutesToHHMM,
  nowHHMM,
  todayISO,
  weekdayOf,
} from '@/utils/date';
import { cn } from '@/utils/misc';
import { burstConfetti } from '@/utils/confetti';

const PX_PER_MIN = 0.8;
const SNAP = 15;

export interface StudyTimelineBlock {
  id: string;
  title: string;
  subjectId: string | null;
  start: number;
  end: number;
  minutes: number;
  method?: string | null;
  fromPomodoro: boolean;
}

export interface AgendaItem {
  id: string;
  kind: 'class' | 'task' | 'study';
  title: string;
  startMin: number;
  endMin: number;
  durationMin: number;
  subjectId: string | null;
  subjectName?: string;
  subjectColor?: string;
  room?: string;
  method?: string | null;
  fromPomodoro?: boolean;
  completed?: boolean;
  task?: Task;
}

type AgendaEntry =
  | { type: 'item'; item: AgendaItem }
  | { type: 'gap'; startMin: number; endMin: number; minutes: number };

/**
 * Ultra-compact Day Planner Timeline.
 * Integrated header, high-density agenda items, and capped container height
 * to eliminate vertical bloat on the Today page.
 */
export function DayTimeline({ date, showHeader = true }: { date: ISODate; showHeader?: boolean }) {
  const data = useData();
  const index = useIndex();
  const openEditor = useUiStore((s) => s.openTaskEditor);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);

  const [view, setView] = useState<'stream' | 'visual'>(() => {
    try {
      return (localStorage.getItem('timeline_view_mode') as 'stream' | 'visual') || 'stream';
    } catch {
      return 'stream';
    }
  });

  const [showUntimed, setShowUntimed] = useState(false);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'resize'; start: number; end: number } | null>(
    null,
  );

  const handleViewChange = (newView: 'stream' | 'visual') => {
    setView(newView);
    try {
      localStorage.setItem('timeline_view_mode', newView);
    } catch {
      // ignore
    }
  };

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

    // Pomodoro focus rounds
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

    // Manual study sessions
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

  // Unified items for Agenda Stream view
  const agendaItems = useMemo<AgendaItem[]>(() => {
    const list: AgendaItem[] = [];

    slots.forEach((s) => {
      const sub = data.subjects.find((item) => item.id === s.subjectId);
      const startMin = hhmmToMinutes(s.start);
      const endMin = hhmmToMinutes(s.end);
      list.push({
        id: `class_${s.id}`,
        kind: 'class',
        title: s.title || sub?.name || 'Class',
        startMin,
        endMin,
        durationMin: Math.max(10, endMin - startMin),
        subjectId: s.subjectId,
        subjectName: sub?.name,
        subjectColor: s.color ?? sub?.color ?? '#64748b',
        room: s.room,
      });
    });

    timedTasks.forEach((t) => {
      const sub = data.subjects.find((item) => item.id === t.subjectId);
      const startMin = hhmmToMinutes(t.start);
      const endMin = t.end ? hhmmToMinutes(t.end) : startMin + (t.estimatedMinutes ?? 45);
      list.push({
        id: `task_${t.id}`,
        kind: 'task',
        title: t.title,
        startMin,
        endMin,
        durationMin: Math.max(10, endMin - startMin),
        subjectId: t.subjectId,
        subjectName: sub?.name,
        subjectColor: sub?.color ?? 'rgb(var(--accent))',
        completed: t.status === 'completed',
        task: t,
      });
    });

    studyBlocks.forEach((sb) => {
      const sub = data.subjects.find((item) => item.id === sb.subjectId);
      list.push({
        id: `study_${sb.id}`,
        kind: 'study',
        title: sb.title,
        startMin: sb.start,
        endMin: sb.end,
        durationMin: sb.minutes,
        subjectId: sb.subjectId,
        subjectName: sub?.name,
        subjectColor: sub?.color ?? '#10b981',
        method: sb.method,
        fromPomodoro: sb.fromPomodoro,
      });
    });

    return list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  }, [slots, timedTasks, studyBlocks, data.subjects]);

  // Interleave significant gaps (>= 30 min) in Agenda Stream
  const agendaEntries = useMemo<AgendaEntry[]>(() => {
    const entries: AgendaEntry[] = [];
    let maxEndSoFar = -1;

    for (const item of agendaItems) {
      if (maxEndSoFar > 0 && item.startMin - maxEndSoFar >= 30) {
        entries.push({
          type: 'gap',
          startMin: maxEndSoFar,
          endMin: item.startMin,
          minutes: item.startMin - maxEndSoFar,
        });
      }
      entries.push({ type: 'item', item });
      maxEndSoFar = Math.max(maxEndSoFar, item.endMin);
    }
    return entries;
  }, [agendaItems]);

  const totalActiveMinutes = useMemo(() => {
    return agendaItems.reduce((acc, it) => acc + it.durationMin, 0);
  }, [agendaItems]);

  // Visual mode blocks
  const blocks = useMemo(() => {
    return [
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
  }, [slots, timedTasks, studyBlocks]);

  const minBlockStart = blocks.length > 0 ? Math.min(...blocks.map((b) => b.start)) : 8 * 60;
  const maxBlockEnd = blocks.length > 0 ? Math.max(...blocks.map((b) => b.end)) : 18 * 60;

  const dayStart = Math.max(0, Math.floor((Math.min(minBlockStart, 8 * 60) - 30) / 60) * 60);
  const dayEnd = Math.min(1440, Math.ceil((Math.max(maxBlockEnd, 18 * 60) + 30) / 60) * 60);
  const visualHeight = (dayEnd - dayStart) * PX_PER_MIN;

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

  const scrollToNow = () => {
    if (gridScrollRef.current && nowMin !== null) {
      const targetY = top(nowMin) - 120;
      gridScrollRef.current.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (view === 'visual' && date === todayISO() && gridScrollRef.current && nowMin !== null) {
      const timer = setTimeout(() => {
        scrollToNow();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [view, date]);

  return (
    <div className="flex flex-1 flex-col h-full justify-between">
      {/* Integrated Single Header */}
      {showHeader && (
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <div className="min-w-0">
            <h3 className="section-title text-xs font-semibold">Timeline</h3>
            <p className="text-[11px] text-muted">
              {agendaItems.length > 0 ? (
                <>
                  <span className="font-medium text-ink tabular">{agendaItems.length}</span> scheduled ·{' '}
                  <span className="tabular">{formatMinutes(totalActiveMinutes, { short: true })}</span>
                </>
              ) : (
                'No events scheduled'
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {view === 'visual' && date === todayISO() && (
              <button
                type="button"
                onClick={scrollToNow}
                className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-muted hover:bg-elevated hover:text-ink transition-colors"
                title="Jump to current time"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                Now
              </button>
            )}

            {/* Compact mode switcher */}
            <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'stream'}
                onClick={() => handleViewChange('stream')}
                className={cn(
                  'flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors',
                  view === 'stream'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink',
                )}
                title="Compact agenda stream"
              >
                <AlignLeft size={12} />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'visual'}
                onClick={() => handleViewChange('visual')}
                className={cn(
                  'flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors',
                  view === 'visual'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink',
                )}
                title="Visual timeline grid"
              >
                <Clock size={12} />
                <span>Visual</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {blocks.length === 0 ? (
        <div className="p-2.5">
          <div className="flex items-center justify-between rounded-ctl border border-dashed border-line/80 px-3 py-2 text-xs text-muted">
            <span className="flex items-center gap-1.5 text-faint">
              <Clock size={13} />
              <span>Nothing scheduled for this day</span>
            </span>
            <button
              type="button"
              className="text-xs font-medium text-accent hover:underline"
              onClick={() => openQuickAdd(date)}
            >
              Schedule a task
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 flex flex-col justify-between">
          {/* Mode 1: Ultra-Compact Agenda Stream */}
          {view === 'stream' && (
            <div className="max-h-[300px] min-h-[220px] overflow-y-auto space-y-1.5 pr-0.5">
              {agendaEntries.map((entry, idx) => {
                if (entry.type === 'gap') {
                  return (
                    <div
                      key={`gap_${entry.startMin}_${entry.endMin}_${idx}`}
                      className="my-1 flex items-center gap-1.5 px-1 text-[10px] text-faint"
                    >
                      <div className="h-px flex-1 border-t border-dashed border-line" />
                      <span className="tabular font-medium text-muted">
                        {formatMinutes(entry.minutes)} free ({formatHHMM12(minutesToHHMM(entry.startMin))} – {formatHHMM12(minutesToHHMM(entry.endMin))})
                      </span>
                      <div className="h-px flex-1 border-t border-dashed border-line" />
                    </div>
                  );
                }

                const item = entry.item;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-center justify-between gap-2 rounded-md border border-line/60 bg-surface/50 px-2 py-1 transition-all hover:border-line hover:bg-surface',
                      item.completed && 'opacity-60 bg-surface/20',
                    )}
                  >
                    {/* Left: Time and indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className="h-4 w-1 shrink-0 rounded-full"
                        style={{ background: item.subjectColor ?? 'rgb(var(--accent))' }}
                      />
                      <span className="w-16 shrink-0 text-xs font-semibold tabular text-ink">
                        {formatHHMM12(minutesToHHMM(item.startMin))}
                      </span>
                      <span className="text-[10px] tabular text-faint">
                        {formatMinutes(item.durationMin, { short: true })}
                      </span>
                    </div>

                    {/* Middle: Title & badges */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
                      <span className={cn('truncate text-xs font-medium text-ink', item.completed && 'line-through text-muted')}>
                        {item.title}
                      </span>

                      {item.kind === 'class' && (
                        <span className="chip shrink-0 text-[9px] py-0 px-1 text-muted border-line/60">
                          Class
                        </span>
                      )}
                      {item.kind === 'task' && (
                        <span className="chip shrink-0 text-[9px] py-0 px-1 text-accent border-accent/25">
                          Task
                        </span>
                      )}
                      {item.kind === 'study' && item.fromPomodoro && (
                        <span className="chip shrink-0 text-[9px] py-0 px-1 text-amber-500 border-amber-500/25 flex items-center gap-0.5">
                          <Flame size={9} /> Pomodoro
                        </span>
                      )}
                      {item.kind === 'study' && !item.fromPomodoro && (
                        <span className="chip shrink-0 text-[9px] py-0 px-1 text-emerald-500 border-emerald-500/25 flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Study
                        </span>
                      )}

                      {item.room && (
                        <span className="flex items-center gap-0.5 text-[10px] text-faint shrink-0">
                          <MapPin size={9} /> {item.room}
                        </span>
                      )}
                      {item.subjectName && (
                        <span className="text-[10px] text-faint truncate hidden sm:inline" style={{ color: item.subjectColor }}>
                          · {item.subjectName}
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.kind === 'task' && item.task && (
                        <>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={item.completed}
                            onClick={() => {
                              if (!item.completed) burstConfetti('small');
                              setTaskStatus(item.task!.id, item.completed ? 'todo' : 'completed');
                            }}
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-[4px] border transition-all active:scale-110',
                              item.completed ? 'border-ok bg-ok text-white' : 'border-line hover:border-accent text-transparent hover:text-muted',
                            )}
                            title={item.completed ? 'Mark incomplete' : 'Complete task'}
                          >
                            <Check size={11} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit task"
                            onClick={() => openEditor(item.task!.id)}
                          >
                            <Pencil size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode 2: Compact Visual Grid */}
          {view === 'visual' && (
            <div
              ref={gridScrollRef}
              className="relative max-h-[340px] overflow-y-auto rounded-md border border-line/60 bg-surface/30 p-2 select-none"
            >
              <div ref={gridRef} className="relative" style={{ height: visualHeight }}>
                {hours.map((m) => (
                  <div key={m} className="absolute inset-x-0 flex items-start gap-1.5" style={{ top: top(m) }}>
                    <span className="w-10 shrink-0 -translate-y-1.5 text-right text-[10px] tabular text-faint">
                      {formatHHMM12(minutesToHHMM(m))}
                    </span>
                    <span className="mt-0 h-px flex-1 bg-line/80" />
                  </div>
                ))}

                {nowMin !== null && nowMin >= dayStart && nowMin <= dayEnd && (
                  <div className="absolute inset-x-0 z-20 flex items-center gap-1.5" style={{ top: top(nowMin) }}>
                    <span className="w-10 shrink-0 text-right text-[10px] font-semibold tabular text-danger">now</span>
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}

                <div className="absolute inset-y-0 left-[48px] right-0">
                  {/* Class Slots */}
                  {slots.map((slot) => {
                    const s = hhmmToMinutes(slot.start);
                    const e = hhmmToMinutes(slot.end);
                    const subject = data.subjects.find((sub) => sub.id === slot.subjectId);
                    const color = slot.color ?? subject?.color ?? '#64748b';
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          'absolute overflow-hidden rounded-ctl border px-1.5 py-0.5',
                          hasClasses ? 'left-0 w-[30%]' : 'left-0 w-[46%]',
                        )}
                        style={{
                          top: top(s),
                          height: Math.max(18, (e - s) * PX_PER_MIN - 2),
                          borderColor: `${color}55`,
                          background: `${color}18`,
                        }}
                        title={`${slot.title || subject?.name || 'Class'} · ${formatHHMM12(slot.start)}–${formatHHMM12(slot.end)}`}
                      >
                        <p className="truncate text-[10px] font-medium text-ink leading-tight">
                          {slot.title || subject?.name || 'Class'}
                        </p>
                        <p className="truncate text-[9px] text-muted">
                          {formatHHMM12(slot.start)} {slot.room && `· ${slot.room}`}
                        </p>
                      </div>
                    );
                  })}

                  {/* Timed Tasks */}
                  {timedTasks.map((task) => {
                    const live = drag?.id === task.id ? drag : null;
                    const s = live ? live.start : hhmmToMinutes(task.start);
                    const e = live
                      ? live.end
                      : task.end
                        ? hhmmToMinutes(task.end)
                        : hhmmToMinutes(task.start) + (task.estimatedMinutes ?? 45);
                    const subject = data.subjects.find((sub) => sub.id === task.subjectId);
                    const color = subject?.color ?? 'rgb(var(--accent))';
                    const done = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'group absolute cursor-grab overflow-hidden rounded-ctl border px-1.5 py-0.5 transition-shadow active:cursor-grabbing',
                          hasClasses ? 'left-[32%] w-[33%]' : 'left-0 w-[48%]',
                          live && 'z-30 shadow-pop',
                          done && 'opacity-60',
                        )}
                        style={{
                          top: top(s),
                          height: Math.max(18, (e - s) * PX_PER_MIN - 2),
                          borderColor: `${color}66`,
                          background: `${color}1f`,
                        }}
                        onPointerDown={(ev) => beginDrag(task, 'move', ev)}
                        onDoubleClick={() => openEditor(task.id)}
                        title="Drag to move · drag bottom edge to resize · double-click to edit"
                      >
                        <p className={cn('truncate text-[10px] font-medium text-ink leading-tight', done && 'line-through')}>
                          {task.title}
                        </p>
                        <p className="truncate text-[9px] tabular text-muted">
                          {formatHHMM12(minutesToHHMM(s))}–{formatHHMM12(minutesToHHMM(e))}
                        </p>
                        <span
                          role="separator"
                          aria-label={`Resize ${task.title}`}
                          onPointerDown={(ev) => beginDrag(task, 'resize', ev)}
                          className="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                          <GripHorizontal size={9} className="text-muted" />
                        </span>
                      </div>
                    );
                  })}

                  {/* Completed Study Sessions */}
                  {studyBlocks.map((sb) => {
                    const subject = data.subjects.find((sub) => sub.id === sb.subjectId);
                    const color = subject?.color ?? '#10b981';

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
                        className="absolute overflow-hidden rounded-ctl border px-1.5 py-0.5 transition-all shadow-xs z-10"
                        style={{
                          top: top(sb.start),
                          left: `${leftPos}%`,
                          width: `${blockWidth}%`,
                          height: Math.max(18, (sb.end - sb.start) * PX_PER_MIN - 2),
                          borderColor: `${color}77`,
                          background: `linear-gradient(135deg, ${color}22 0%, ${color}0e 100%)`,
                        }}
                        title={`${sb.title} · ${sb.minutes}m logged (${sb.fromPomodoro ? 'Pomodoro' : 'Study'})`}
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <p className="truncate text-[10px] font-semibold text-ink flex items-center gap-1 leading-tight">
                            {sb.fromPomodoro ? <Flame size={9} className="text-amber-500 shrink-0" /> : <CheckCircle2 size={9} className="text-emerald-500 shrink-0" />}
                            <span className="truncate">{sb.title}</span>
                          </p>
                          <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular">
                            {sb.minutes}m
                          </span>
                        </div>
                        <p className="truncate text-[9px] tabular text-muted">
                          {formatHHMM12(minutesToHHMM(sb.start))}–{formatHHMM12(minutesToHHMM(sb.end))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Untimed Items Drawer */}
      {(untimed.length > 0 || untimedStudySessions.length > 0) && (
        <div className="border-t border-line/60 px-3 py-1.5 bg-surface/30">
          <button
            type="button"
            onClick={() => setShowUntimed(!showUntimed)}
            className="flex w-full items-center justify-between text-[11px] text-muted hover:text-ink transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {untimed.length > 0 && `${untimed.length} untimed task${untimed.length === 1 ? '' : 's'}`}
              {untimed.length > 0 && untimedStudySessions.length > 0 && ' · '}
              {untimedStudySessions.length > 0 && `${untimedStudySessions.length} untimed session${untimedStudySessions.length === 1 ? '' : 's'}`}
            </span>
            <span className="text-[10px] font-medium text-accent hover:underline">
              {showUntimed ? 'Hide' : 'View'}
            </span>
          </button>

          {showUntimed && (
            <div className="mt-1.5 space-y-1 rounded-md border border-line/60 bg-elevated/40 p-2 text-xs">
              {untimed.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="truncate text-muted">{t.title}</span>
                  <button
                    type="button"
                    onClick={() => openEditor(t.id)}
                    className="ml-2 shrink-0 text-[10px] text-accent hover:underline"
                  >
                    Schedule
                  </button>
                </div>
              ))}
              {untimedStudySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="truncate">{s.topic || 'General study'}</span>
                  <span className="tabular text-[10px]">{s.minutes} min</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
