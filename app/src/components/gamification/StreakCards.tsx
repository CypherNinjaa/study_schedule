import { Snowflake } from 'lucide-react';
import { useData } from '@/hooks/useMetrics';
import { spendStreakFreeze } from '@/store/actions';
import { confirmAction } from '@/utils/confirm';
import { STREAK_RULES, freezesRemainingThisWeek } from '@/services/streaks';
import { addDaysISO, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

/**
 * Streak ledger strip. Compact and archival: single unified card with hairlines,
 * tabular figures, and deliberate freeze actions.
 */
export function StreakCards({ compact = false }: { compact?: boolean }) {
  const data = useData();
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="section-title">Consistency</h3>
        <span className="text-xs text-muted">Active & best streaks</span>
      </div>
      <div
        className={cn(
          'grid divide-y sm:divide-y-0 sm:divide-x divide-line',
          compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
        )}
      >
        {STREAK_RULES.map((rule) => {
          const streak = data.streaks.streaks[rule.key];
          const alive = streak.current > 0;
          const left = freezesRemainingThisWeek(data, rule.key, today);
          const missedYesterday = streak.lastQualifiedDate !== null && streak.lastQualifiedDate < yesterday;
          const canFreeze = left > 0 && missedYesterday && streak.best > 0;

          return (
            <div key={rule.key} className="flex flex-col justify-between p-3.5">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-medium text-muted" title={rule.description(data)}>
                  {rule.label}
                </span>
                {canFreeze && (
                  <button
                    type="button"
                    className="btn-icon h-5 w-5 text-accent"
                    title={`Use streak freeze for ${yesterday} (${left} left this week)`}
                    aria-label={`Use streak freeze for ${yesterday}`}
                    onClick={() =>
                      confirmAction({
                        title: 'Use streak freeze?',
                        message: `This protects your ${rule.label.toLowerCase()} streak for ${yesterday}. You have ${left} freeze${
                          left === 1 ? '' : 's'
                        } left this week.`,
                        confirmLabel: 'Use freeze',
                        onConfirm: () => spendStreakFreeze(rule.key, yesterday),
                      })
                    }
                  >
                    <Snowflake size={12} />
                  </button>
                )}
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className={cn('text-xl font-semibold tabular', alive ? 'text-ink' : 'text-faint')}>
                  {streak.current}
                </span>
                <span className="text-xs text-muted">
                  {streak.current === 1 ? 'day' : 'days'}
                </span>
              </div>
              {!compact && (
                <p className="text-[11px] text-faint tabular">
                  Best {streak.best} · {streak.totalDays} total
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
