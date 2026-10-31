import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { useData, useIndex } from '@/hooks/useMetrics';
import { computeInsights, type InsightTone } from '@/services/insights';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

const TONE_PIPS: Record<InsightTone, string> = {
  positive: 'bg-ok',
  neutral: 'bg-accent',
  warning: 'bg-warn',
};

/**
 * Insights are computed locally from the user's own numbers.
 */
export function InsightList({ limit }: { limit?: number }) {
  const data = useData();
  const index = useIndex();
  const all = useMemo(() => computeInsights(data, todayISO(), index), [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = limit ? all.slice(0, limit) : all;

  return (
    <Card>
      <CardHeader
        title="Observations"
        subtitle={
          all.length === 0
            ? 'Patterns appear here as sessions and habits are recorded'
            : `${all.length} observation${all.length === 1 ? '' : 's'} based on your recent activity`
        }
      />
      {shown.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted">
          <Lightbulb size={16} className="shrink-0 text-muted" />
          <span>Log study sessions and complete habits to see patterns emerge.</span>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((insight) => (
            <li key={insight.id} className="flex items-start gap-3.5 px-4 py-3">
              <span className="mt-2 flex h-2 w-2 shrink-0 items-center justify-center">
                <span className={cn('h-1.5 w-1.5 rounded-full', TONE_PIPS[insight.tone])} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{insight.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{insight.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
