import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { useData, useIndex } from '@/hooks/useMetrics';
import { computeInsights, type InsightTone } from '@/services/insights';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { LucideIcon } from '@/components/ui/Celebrations';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

const TONE: Record<InsightTone, string> = {
  positive: 'bg-ok/12 text-ok',
  neutral: 'bg-accent/12 text-accent',
  warning: 'bg-warn/12 text-warn',
};

/**
 * Insights are computed locally from the user's own numbers — no model, no
 * network call, nothing leaves the device.
 */
export function InsightList({ limit }: { limit?: number }) {
  const data = useData();
  const index = useIndex();
  const all = useMemo(() => computeInsights(data, todayISO(), index), [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = limit ? all.slice(0, limit) : all;

  return (
    <Card>
      <CardHeader
        title="What your data says"
        subtitle={
          all.length === 0
            ? 'A few days of tracking and patterns start showing up here'
            : `${all.length} observation${all.length === 1 ? '' : 's'}, computed on this device`
        }
      />
      {shown.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted">
          <Lightbulb size={18} className="shrink-0 text-muted" />
          Log study time, tick a few habits and finish some tasks — patterns need data to appear.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((insight) => (
            <li key={insight.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl',
                  TONE[insight.tone],
                )}
              >
                <LucideIcon name={insight.icon} size={16} />
              </span>
              <div className="min-w-0">
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
