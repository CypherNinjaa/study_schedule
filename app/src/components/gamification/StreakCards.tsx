import { Snowflake } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useData } from '@/hooks/useMetrics';
import { useStreakFreeze } from '@/store/actions';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { STREAK_RULES, freezesRemainingThisWeek } from '@/services/streaks';
import { addDaysISO, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

/**
 * Streak strip. A freeze is deliberately awkward to spend: one click, one
 * confirmation, and only for a day that has already passed — so it protects a
 * genuine miss rather than becoming a way to fake consistency.
 */
export function StreakCards({ compact = false }: { compact?: boolean }) {
  const data = useData();
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);

  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6')}>
      {STREAK_RULES.map((rule) => {
        const streak = data.streaks.streaks[rule.key];
        const alive = streak.current > 0;
        const left = freezesRemainingThisWeek(data, rule.key, today);
        const missedYesterday = streak.lastQualifiedDate !== null && streak.lastQualifiedDate < yesterday;
        const canFreeze = left > 0 && missedYesterday && streak.best > 0;

        return (
          <div key={rule.key} className="card flex flex-col gap-1 p-3">
            <div className="flex items-center justify-between">
              <span className="text-base leading-none" aria-hidden>
                {rule.icon}
              </span>
              {canFreeze && (
                <button
                  type="button"
                  className="btn-icon h-6 w-6 text-accent"
                  title={`Use a streak freeze for ${yesterday} (${left} left this week)`}
                  aria-label={`Use a streak freeze for ${yesterday}`}
                  onClick={() =>
                    confirmAction({
                      title: 'Use a streak freeze?',
                      message: `This protects your ${rule.label.toLowerCase()} streak for ${yesterday}. You have ${left} freeze${
                        left === 1 ? '' : 's'
                      } left this week, and it will not count as a day you actually did the work.`,
                      confirmLabel: 'Use freeze',
                      onConfirm: () => useStreakFreeze(rule.key, yesterday),
                    })
                  }
                >
                  <Snowflake size={13} />
                </button>
              )}
            </div>
            <p className={cn('text-lg font-semibold tabular', alive ? 'text-ink' : 'text-faint')}>
              {streak.current}
              <span className="ml-1 text-[11px] font-normal text-muted">
                {streak.current === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="truncate text-[11px] text-muted" title={rule.description(data)}>
              {rule.label}
            </p>
            {!compact && (
              <p className="text-[10px] text-faint">
                Best {streak.best} · {streak.totalDays} total
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Hook-free variant used where the store is read directly. */
export function useStreakSummary() {
  return useDataStore((s) => s.data?.streaks.streaks ?? null);
}
