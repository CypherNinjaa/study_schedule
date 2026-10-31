import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type { ISODate, TimeAllocation } from '@/types';
import { setDayMinutes, updateDailyLog } from '@/store/actions';
import { useData, useDayMetrics, useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader, ProgressBar } from '@/components/ui/Primitives';
import { timeAllocation } from '@/services/metrics';
import { durationBetween, formatMinutes } from '@/utils/date';
import { cn } from '@/utils/misc';

const FIELDS: { key: keyof TimeAllocation; label: string; hint: string }[] = [
  { key: 'study', label: 'Study', hint: 'On top of logged sessions' },
  { key: 'coding', label: 'Coding', hint: 'On top of logged sessions' },
  { key: 'college', label: 'College', hint: 'Overrides the timetable estimate' },
  { key: 'travel', label: 'Travel', hint: 'Overrides the default commute' },
  { key: 'exercise', label: 'Exercise', hint: '' },
  { key: 'relationship', label: 'Relationship', hint: 'Private to you' },
  { key: 'entertainment', label: 'Entertainment', hint: '' },
  { key: 'socialMedia', label: 'Social media', hint: 'Counted against your own limit' },
  { key: 'other', label: 'Other', hint: '' },
];

const SEGMENT_COLOR: Record<string, string> = {
  sleep: 'rgb(var(--c-sleep))',
  study: 'rgb(var(--c-study))',
  coding: 'rgb(var(--c-code))',
  college: 'rgb(var(--c-college))',
  travel: 'rgb(var(--muted))',
  exercise: 'rgb(var(--c-exercise))',
  relationship: 'rgb(var(--c-rel))',
  entertainment: 'rgb(var(--c-warn))',
  socialMedia: 'rgb(var(--c-danger))',
  other: 'rgb(var(--faint))',
  free: 'rgb(var(--line))',
};

/** Where the 24 hours went, plus the manual entry that feeds it. */
export function TimeAllocationEditor({ date, className }: { date: ISODate; className?: string }) {
  const data = useData();
  const index = useIndex();
  const metrics = useDayMetrics(date);
  const log = index.logs.get(date);
  const alloc = timeAllocation(metrics);

  const [wokeAt, setWokeAt] = useState(log?.wokeAt ?? '');
  const [sleptAt, setSleptAt] = useState(log?.sleptAt ?? '');

  useEffect(() => {
    setWokeAt(log?.wokeAt ?? '');
    setSleptAt(log?.sleptAt ?? '');
  }, [date, log?.wokeAt, log?.sleptAt]);

  const segments = Object.entries(alloc).filter(([, v]) => v > 0);
  const totalTracked = 1440 - alloc.free;

  const commitSleep = (nextWoke: string, nextSlept: string) => {
    const patch: Parameters<typeof updateDailyLog>[1] = {
      wokeAt: nextWoke || null,
      sleptAt: nextSlept || null,
    };
    // Sleep length is derived when both ends are known; crossing midnight is
    // handled by durationBetween.
    patch.sleepMinutes = nextWoke && nextSlept ? durationBetween(nextSlept, nextWoke) : null;
    updateDailyLog(date, patch);
  };

  return (
    <Card className={cn('flex flex-col justify-between h-full', className)}>
      <CardHeader
        title="Where the day went"
        subtitle={`${formatMinutes(totalTracked)} tracked · ${formatMinutes(alloc.free)} unaccounted`}
      />

      <div className="px-3.5 pt-2.5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line" role="img" aria-label="Time allocation">
          {segments.map(([key, minutes]) => (
            <span
              key={key}
              style={{ width: `${(minutes / 1440) * 100}%`, background: SEGMENT_COLOR[key] ?? 'rgb(var(--muted))' }}
              title={`${key}: ${formatMinutes(minutes)}`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
          {segments.map(([key, minutes]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-muted">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: SEGMENT_COLOR[key] ?? 'rgb(var(--muted))' }}
              />
              {key} {formatMinutes(minutes, { short: true })}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3.5 pt-3">
        <label className="block">
          <span className="label text-[11px] mb-1 flex items-center gap-1">
            <Moon size={11} /> Slept at
          </span>
          <input
            type="time"
            className="input py-1 text-xs"
            value={sleptAt}
            onChange={(e) => setSleptAt(e.target.value)}
            onBlur={() => commitSleep(wokeAt, sleptAt)}
          />
        </label>
        <label className="block">
          <span className="label text-[11px] mb-1 flex items-center gap-1">
            <Sun size={11} /> Woke at
          </span>
          <input
            type="time"
            className="input py-1 text-xs"
            value={wokeAt}
            onChange={(e) => setWokeAt(e.target.value)}
            onBlur={() => commitSleep(wokeAt, sleptAt)}
          />
        </label>
      </div>

      {metrics.sleepMinutes !== null && (
        <div className="px-3.5 pt-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted text-[11px]">Sleep</span>
            <span className="tabular text-ink text-[11px]">
              {formatMinutes(metrics.sleepMinutes)} / {formatMinutes(data.settings.targets.sleep)}
            </span>
          </div>
          <ProgressBar
            className="mt-1 h-1"
            value={metrics.sleepMinutes / data.settings.targets.sleep}
            tone={metrics.sleepMinutes < data.settings.targets.sleep - 60 ? 'warn' : 'ok'}
            label="Sleep against target"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 p-3.5 pt-2.5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="label text-[10px] mb-0.5 truncate" title={f.hint}>
              {f.label}
            </span>
            <input
              type="number"
              min={0}
              step={5}
              className="input py-1 px-2 text-xs tabular h-7"
              value={log?.minutes[f.key] ?? 0}
              onChange={(e) => setDayMinutes(date, f.key, Number(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
    </Card>
  );
}
