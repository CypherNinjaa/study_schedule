import { Check, Clock, Copy, MoreHorizontal, Pencil, SkipForward, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '@/types';
import { deleteTask, duplicateTask, postponeTask, setTaskStatus } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { confirmAction } from '@/utils/confirm';
import { formatHHMM12, formatMinutes, todayISO, addDaysISO } from '@/utils/date';
import { cn } from '@/utils/misc';
import { taskXP } from '@/services/xp';
import { burstConfetti } from '@/utils/confetti';

const PRIORITY_TONE: Record<Task['priority'], string> = {
  low: 'text-muted',
  medium: 'text-accent',
  high: 'text-warn',
  critical: 'text-danger',
};

export function TaskRow({ task, showDate = false }: { task: Task; showDate?: boolean }) {
  const subject = useDataStore((s) => s.data?.subjects.find((sub) => sub.id === task.subjectId));
  const openEditor = useUiStore((s) => s.openTaskEditor);
  const [menuOpen, setMenuOpen] = useState(false);

  const done = task.status === 'completed';
  const skipped = task.status === 'skipped';
  const overdue = !done && !skipped && task.date < todayISO();

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-ctl border border-transparent px-2.5 py-2 transition-colors hover:border-line hover:bg-elevated',
        done && 'opacity-60',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark ${task.title} as not done` : `Complete ${task.title}`}
        onClick={() => {
          if (!done) {
            burstConfetti('small');
          }
          setTaskStatus(task.id, done ? 'todo' : 'completed');
        }}
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all active:scale-125',
          done ? 'border-ok bg-ok text-white' : 'border-line hover:border-accent',
        )}
      >
        {done && <Check size={12} strokeWidth={3} className="animate-pop" />}
      </button>

      <button type="button" onClick={() => openEditor(task.id)} className="min-w-0 flex-1 text-left">
        <p className={cn('truncate text-sm text-ink', done && 'line-through', skipped && 'text-muted line-through')}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {task.start && (
            <span className="flex items-center gap-1 tabular">
              <Clock size={11} />
              {formatHHMM12(task.start)}
              {task.end && `–${formatHHMM12(task.end)}`}
            </span>
          )}
          {showDate && <span className="tabular">{task.date}</span>}
          {overdue && <span className="font-medium text-danger">Overdue</span>}
          {subject && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: subject.color }} />
              {subject.code}
            </span>
          )}
          <span className={PRIORITY_TONE[task.priority]}>{task.priority}</span>
          {task.estimatedMinutes ? <span className="tabular">{formatMinutes(task.estimatedMinutes, { short: true })}</span> : null}
          <span className="tabular text-faint">
            {done && task.xpAwarded > 0 ? `+${task.xpAwarded} XP` : `${taskXP(task.difficulty, task.priority)} XP`}
          </span>
        </div>
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          className="btn-icon h-7 w-7 opacity-0 focus:opacity-100 group-hover:opacity-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Actions for ${task.title}`}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-ctl border border-line bg-elevated py-1 shadow-pop">
              <MenuItem
                icon={<Pencil size={14} />}
                label="Edit"
                onClick={() => {
                  openEditor(task.id);
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Clock size={14} />}
                label="Move to tomorrow"
                onClick={() => {
                  postponeTask(task.id, addDaysISO(task.date, 1));
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<SkipForward size={14} />}
                label={skipped ? 'Un-skip' : 'Skip today'}
                onClick={() => {
                  setTaskStatus(task.id, skipped ? 'todo' : 'skipped');
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Copy size={14} />}
                label="Duplicate"
                onClick={() => {
                  duplicateTask(task.id);
                  setMenuOpen(false);
                }}
              />
              <MenuItem
                icon={<Trash2 size={14} />}
                label="Delete"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  confirmAction({
                    title: 'Delete this task?',
                    message: `"${task.title}" will be removed. This can't be undone.`,
                    confirmLabel: 'Delete',
                    danger: true,
                    onConfirm: () => deleteTask(task.id),
                  });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface',
        danger ? 'text-danger' : 'text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
