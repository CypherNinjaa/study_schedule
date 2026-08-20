import { Snowflake } from 'lucide-react';
import { useData } from '@/hooks/useMetrics';
import { spendStreakFreeze } from '@/store/actions';
import { confirmAction } from '@/utils/confirm';
import { STREAK_RULES, freezesRemainingThisWeek } from '@/services/streaks';
import { addDaysISO, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';
import { Glyph } from '@/components/ui/Celebrations';

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
        const isMilestone = streak.current >= 7 && (streak.current % 7 === 0 || streak.current === 30 || streak.current === 100);
        const left = freezesRemainingThisWeek(data, rule.key, today);
        const missedYesterday = streak.lastQualifiedDate !== null && streak.lastQualifiedDate < yesterday;
        const canFreeze = left > 0 && missedYesterday && streak.best > 0;

        return (
          <div
            key={rule.key}
            className={cn(
              'card flex flex-col gap-1 p-3 transition-shadow',
              isMilestone && 'ring-1 ring-accent/40 shadow-sm',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-accent flex items-center justify-center h-5 w-5" aria-hidden>
                <Glyph name={rule.icon} size={15} />
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
                      onConfirm: () => spendStreakFreeze(rule.key, yesterday),
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
