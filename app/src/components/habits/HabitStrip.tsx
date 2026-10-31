import { Check } from 'lucide-react';
import type { ISODate } from '@/types';
import { toggleHabit } from '@/store/actions';
import { useData, useIndex } from '@/hooks/useMetrics';
import { habitsDueOn } from '@/services/metrics';
import { Glyph } from '@/components/ui/Celebrations';
import { cn } from '@/utils/misc';

/** One-tap habit strip, shared by the dashboard and the Today page. */
export function HabitStrip({ date, className }: { date: ISODate; className?: string }) {
  const data = useData();
  const index = useIndex();
  const due = habitsDueOn(data.habits, date);
  const log = index.logs.get(date);
  const done = new Set(log?.habitsDone ?? []);

  if (due.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted">No habits due today.</p>;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {due.map((habit) => {
        const isDone = done.has(habit.id);
        return (
          <button
            key={habit.id}
            type="button"
            aria-pressed={isDone}
            onClick={() => toggleHabit(habit.id, date)}
            className={cn(
              'flex items-center gap-2 rounded-ctl border px-2.5 py-1.5 text-xs transition-colors',
              isDone
                ? 'border-transparent text-white'
                : 'border-line bg-surface text-muted hover:border-line hover:text-ink hover:bg-elevated',
            )}
            style={isDone ? { background: habit.color } : undefined}
          >
            <span
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border',
                isDone ? 'border-white/60 bg-white/20' : 'border-line',
              )}
            >
              {isDone && <Check size={10} strokeWidth={2.5} />}
            </span>
            <Glyph name={habit.icon} size={13} className={isDone ? 'text-white' : undefined} />
            <span className="max-w-[10.5rem] truncate font-medium">{habit.name}</span>
            {habit.inverse && <span className="text-[10px] text-faint">Avoid</span>}
          </button>
        );
      })}
    </div>
  );
}
