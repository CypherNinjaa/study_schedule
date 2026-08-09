import { useMemo } from 'react';
import type { ISODate } from '@/types';
import { addDaysISO, monthName, weekdayName, weekdayOf } from '@/utils/date';
import { cn } from '@/utils/misc';

export interface HeatmapCell {
  date: ISODate;
  /** 0..1 — drives the shade */
  intensity: number;
  /** shown in the tooltip */
  label: string;
}

const LEVELS = 5;

/**
 * GitHub-style contribution grid. Columns are weeks, rows are weekdays, and the
 * shade comes from a caller-supplied 0..1 intensity so the same component can
 * plot study minutes, habit completion, or anything else per day.
 */
export function Heatmap({
  cells,
  weeks = 26,
  end,
  tone = 'var(--accent)',
  weekStartsOn = 1,
  onSelect,
}: {
  cells: HeatmapCell[];
  weeks?: number;
  end: ISODate;
  tone?: string;
  weekStartsOn?: 0 | 1;
  onSelect?: (date: ISODate) => void;
}) {
  const byDate = useMemo(() => new Map(cells.map((c) => [c.date, c])), [cells]);

  // Walk back to the start of the week containing `end`, then back `weeks - 1`
  // more weeks, so every column is a full aligned week.
  const columns = useMemo(() => {
    const endWeekday = weekdayOf(end);
    const offsetToWeekEnd = (6 + weekStartsOn - endWeekday + 7) % 7;
    const gridEnd = addDaysISO(end, offsetToWeekEnd);
    const gridStart = addDaysISO(gridEnd, -(weeks * 7 - 1));

    const cols: ISODate[][] = [];
    for (let w = 0; w < weeks; w += 1) {
      const col: ISODate[] = [];
      for (let d = 0; d < 7; d += 1) col.push(addDaysISO(gridStart, w * 7 + d));
      cols.push(col);
    }
    return cols;
  }, [end, weeks, weekStartsOn]);

  const rowLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => weekdayName((i + weekStartsOn) % 7, true));

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-8 text-[10px] text-faint">
          {columns.map((col, i) => {
            const first = col[0];
            const prev = i > 0 ? columns[i - 1][0] : null;
            const showMonth = i === 0 || (prev && first.slice(5, 7) !== prev.slice(5, 7));
            return (
              <span key={first} className="w-[11px] shrink-0 overflow-visible whitespace-nowrap">
                {showMonth ? monthName(Number(first.slice(5, 7)) - 1, true) : ''}
              </span>
            );
          })}
        </div>

        <div className="flex gap-[3px]">
          <div className="flex w-8 shrink-0 flex-col gap-[3px] pr-1 text-right text-[9px] leading-[11px] text-faint">
            {rowLabels.map((l, i) => (
              <span key={l} className="h-[11px]">
                {i % 2 === 1 ? l : ''}
              </span>
            ))}
          </div>
          {columns.map((col) => (
            <div key={col[0]} className="flex flex-col gap-[3px]">
              {col.map((date) => {
                const cell = byDate.get(date);
                const future = date > end;
                const level = cell ? Math.min(LEVELS - 1, Math.ceil(cell.intensity * (LEVELS - 1))) : 0;
                const filled = Boolean(cell && cell.intensity > 0);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={future || !onSelect}
                    onClick={() => onSelect?.(date)}
                    title={future ? date : (cell?.label ?? `${date} · nothing logged`)}
                    aria-label={future ? date : (cell?.label ?? `${date}, nothing logged`)}
                    className={cn(
                      'h-[11px] w-[11px] shrink-0 rounded-[2px] transition-transform',
                      future ? 'opacity-0' : 'bg-line',
                      onSelect && !future && 'hover:scale-125',
                    )}
                    style={
                      filled
                        ? { background: `rgb(${tone} / ${0.18 + (level / (LEVELS - 1)) * 0.82})` }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 pl-8 pt-1 text-[10px] text-faint">
          <span>Less</span>
          {Array.from({ length: LEVELS }, (_, i) => (
            <span
              key={i}
              className={cn('h-[11px] w-[11px] rounded-[2px]', i === 0 && 'bg-line')}
              style={i === 0 ? undefined : { background: `rgb(${tone} / ${0.18 + (i / (LEVELS - 1)) * 0.82})` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
