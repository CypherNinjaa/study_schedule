import { Check } from 'lucide-react';
import type { ISODate } from '@/types';
import { toggleHabit } from '@/store/actions';
import { useData, useIndex } from '@/hooks/useMetrics';
import { habitsDueOn } from '@/services/metrics';
import { Glyph } from '@/components/ui/Celebrations';
import { cn } from '@/utils/misc';

/** Compact one-tap habit row, shared by the dashboard and the Today page. */
export function HabitStrip({ date }: { date: ISODate }) {
  const data = useData();
  const index = useIndex();
  const due = habitsDueOn(data.habits, date);
  const log = index.logs.get(date);
  const done = new Set(log?.habitsDone ?? []);

  if (due.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted">No habits due today. Enjoy the gap.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {due.map((habit) => {
        const isDone = done.has(habit.id);
        return (
          <button
            key={habit.id}
            type="button"
            aria-pressed={isDone}
            onClick={() => toggleHabit(habit.id, date)}
            className={cn(
              'flex items-center gap-2 rounded-ctl border px-2.5 py-1.5 text-sm transition-colors',
              isDone
                ? 'border-transparent text-white'
                : 'border-line text-muted hover:border-accent hover:text-ink',
            )}
            style={isDone ? { background: habit.color } : undefined}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
                isDone ? 'border-white/60 bg-white/20' : 'border-line',
              )}
            >
              {isDone && <Check size={11} strokeWidth={3} />}
            </span>
            <Glyph name={habit.icon} size={14} className={isDone ? 'text-white' : undefined} />
            <span className="max-w-[10rem] truncate">{habit.name}</span>
            {habit.inverse && <span className="text-[10px] uppercase opacity-70">avoid</span>}
          </button>
        );
      })}
    </div>
  );
}
