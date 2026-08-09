import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import type { ISODate, TimeAllocation } from '@/types';
import { setDayMinutes, updateDailyLog } from '@/store/actions';
import { useData, useDayMetrics, useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader, ProgressBar } from '@/components/ui/Primitives';
import { timeAllocation } from '@/services/metrics';
import { durationBetween, formatMinutes } from '@/utils/date';

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
export function TimeAllocationEditor({ date }: { date: ISODate }) {
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
    <Card>
      <CardHeader
        title="Where the day went"
        subtitle={`${formatMinutes(totalTracked)} tracked · ${formatMinutes(alloc.free)} unaccounted`}
      />

      <div className="px-4 pt-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-line" role="img" aria-label="Time allocation">
          {segments.map(([key, minutes]) => (
            <span
              key={key}
              style={{ width: `${(minutes / 1440) * 100}%`, background: SEGMENT_COLOR[key] ?? 'rgb(var(--muted))' }}
              title={`${key}: ${formatMinutes(minutes)}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {segments.map(([key, minutes]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SEGMENT_COLOR[key] ?? 'rgb(var(--muted))' }}
              />
              {key} {formatMinutes(minutes, { short: true })}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <label className="block">
          <span className="label flex items-center gap-1">
            <Moon size={12} /> Slept at
          </span>
          <input
            type="time"
            className="input"
            value={sleptAt}
            onChange={(e) => setSleptAt(e.target.value)}
            onBlur={() => commitSleep(wokeAt, sleptAt)}
          />
        </label>
        <label className="block">
          <span className="label flex items-center gap-1">
            <Sun size={12} /> Woke at
          </span>
          <input
            type="time"
            className="input"
            value={wokeAt}
            onChange={(e) => setWokeAt(e.target.value)}
            onBlur={() => commitSleep(wokeAt, sleptAt)}
          />
        </label>
      </div>

      {metrics.sleepMinutes !== null && (
        <div className="px-4 pt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Sleep</span>
            <span className="tabular text-ink">
              {formatMinutes(metrics.sleepMinutes)} of {formatMinutes(data.settings.targets.sleep)}
            </span>
          </div>
          <ProgressBar
            className="mt-1.5"
            value={metrics.sleepMinutes / data.settings.targets.sleep}
            tone={metrics.sleepMinutes < data.settings.targets.sleep - 60 ? 'warn' : 'ok'}
            label="Sleep against target"
          />
          {metrics.sleepMinutes < data.settings.targets.sleep - 60 && (
            <p className="mt-1 text-[11px] text-muted">
              Short of your own target. Worth noting when you look back at how much you got done.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="label" title={f.hint}>
              {f.label}
            </span>
            <input
              type="number"
              min={0}
              step={5}
              className="input tabular"
              value={log?.minutes[f.key] ?? 0}
              onChange={(e) => setDayMinutes(date, f.key, Number(e.target.value) || 0)}
            />
          </label>
        ))}
      </div>
      <p className="px-4 pb-4 text-[11px] leading-relaxed text-muted">
        Minutes, not hours. Relationship time is recorded exactly like any other category — it is yours, it stays on
        this device, and nothing here judges it.
      </p>
    </Card>
  );
}
