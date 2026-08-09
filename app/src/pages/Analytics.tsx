import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ISODate } from '@/types';
import { useDataStore } from '@/store/useDataStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, Segmented, StatCard } from '@/components/ui/Primitives';
import { Heatmap, type HeatmapCell } from '@/components/charts/Heatmap';
import { InsightList } from '@/components/insights/InsightList';
import {
  computeRangeMetrics,
  productivityScore,
  scoreLabel,
  subjectStats,
  weekdayAverages,
} from '@/services/metrics';
import { addDaysISO, formatDateShort, formatMinutes, monthName, todayISO, weekdayName } from '@/utils/date';
import { mean, sum, trendPct } from '@/utils/misc';

type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

const RANGES: { value: RangeKey; label: string; days: number | null }[] = [
  { value: '7d', label: '7D', days: 7 },
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: '6m', label: '6M', days: 182 },
  { value: '1y', label: '1Y', days: 365 },
  { value: 'all', label: 'ALL', days: null },
];

const AXIS = { stroke: 'rgb(var(--faint))', fontSize: 11 };

function tooltipStyle() {
  return {
    background: 'rgb(var(--surface))',
    border: '1px solid rgb(var(--line))',
    borderRadius: 8,
    fontSize: 12,
    color: 'rgb(var(--ink))',
  };
}

export default function Analytics() {
  const data = useData();
  const index = useIndex();
  const setActiveDate = useDataStore((s) => s.setActiveDate);
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const today = todayISO();

  const earliest = useMemo(() => {
    const candidates = [
      ...data.dailyLogs.map((l) => l.date),
      ...data.studySessions.map((s) => s.date),
      ...data.tasks.map((t) => t.date),
      data.profile.createdAt.slice(0, 10),
    ].filter(Boolean);
    return candidates.length ? candidates.reduce((a, b) => (a < b ? a : b)) : today;
  }, [data, today]);

  const days = RANGES.find((r) => r.value === rangeKey)?.days ?? null;
  const from = days === null ? earliest : addDaysISO(today, -(days - 1));

  const range = useMemo(() => computeRangeMetrics(data, from, today, index), [data, from, today, index]);
  const prevFrom = days === null ? null : addDaysISO(from, -days);
  const prev = useMemo(
    () => (prevFrom ? computeRangeMetrics(data, prevFrom, addDaysISO(from, -1), index) : null),
    [data, prevFrom, from, index],
  );

  const scoreSeries = useMemo(
    () =>
      range.days.map((d) => ({
        date: d.date,
        label: formatDateShort(d.date),
        score: d.hasAnyActivity ? productivityScore(data, d, index).total : null,
        study: Math.round((d.studyMinutes / 60) * 10) / 10,
        coding: Math.round((d.codingMinutes / 60) * 10) / 10,
        tasks: d.tasksCompleted,
        xp: d.xpEarned,
        sleep: d.sleepMinutes === null ? null : Math.round((d.sleepMinutes / 60) * 10) / 10,
      })),
    [range.days, data, index],
  );

  const scored = scoreSeries.filter((d) => d.score !== null).map((d) => d.score as number);
  const avgScore = scored.length ? Math.round(mean(scored)) : 0;
  const prevAvg = prev ? Math.round(prev.avgScore) : null;
  const scoreTrend = prevAvg !== null && prevAvg > 0 ? trendPct(prevAvg, avgScore) : null;
  const studyTrend = prev ? trendPct(prev.studyMinutes, range.studyMinutes) : null;
  const taskTrend = prev ? trendPct(prev.tasksCompleted, range.tasksCompleted) : null;
  const xpTrend = prev ? trendPct(prev.xpEarned, range.xpEarned) : null;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Analytics"
        subtitle={`${formatDateShort(from)} – ${formatDateShort(today)} · ${range.activeDays} active days`}
        action={<Segmented value={rangeKey} onChange={setRangeKey} options={RANGES} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average score"
          value={avgScore}
          hint={`${scoreLabel(avgScore)}${formatTrend(scoreTrend)}`}
          tone="var(--accent)"
        />
        <StatCard
          label="Study time"
          value={formatMinutes(range.studyMinutes, { short: true })}
          hint={`${formatMinutes(Math.round(range.studyMinutes / Math.max(1, range.days.length)), { short: true })} a day${formatTrend(studyTrend)}`}
          tone="var(--c-study)"
        />
        <StatCard
          label="Tasks completed"
          value={range.tasksCompleted}
          hint={`of ${range.tasksTotal} planned${formatTrend(taskTrend)}`}
          tone="var(--c-ok)"
        />
        <StatCard
          label="XP earned"
          value={range.xpEarned.toLocaleString()}
          hint={`${range.pomodoros} pomodoros${formatTrend(xpTrend)}`}
          tone="var(--c-warn)"
        />
      </div>

      {range.activeDays === 0 ? (
        <Card>
          <CardHeader title="Nothing to chart yet" subtitle="These fill in as you log work" />
          <p className="p-4 text-sm text-muted">
            Log a study session, tick a habit or complete a task and the charts below start building. Nothing here is
            made up — every point comes from something you recorded.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Productivity score" subtitle="Days with no activity are left out rather than scored 0" />
            <div className="h-64 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle()} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="rgb(var(--accent))"
                    strokeWidth={2}
                    fill="url(#scoreFill)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-3 xl:grid-cols-2">
            <Card>
              <CardHeader title="Study and coding hours" subtitle="What you actually logged, per day" />
              <div className="h-56 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="study" name="Study" stackId="t" fill="rgb(var(--c-study))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="coding" name="Coding" stackId="t" fill="rgb(var(--c-code))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Tasks completed" subtitle="One bar per day" />
              <div className="h-56 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle()} />
                    <Bar dataKey="tasks" name="Completed" fill="rgb(var(--c-ok))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <SubjectCharts from={from} to={today} />

          <div className="grid gap-3 xl:grid-cols-2">
            <WeekdayChart />
            <SleepChart series={scoreSeries} />
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <TimeSplitChart from={from} to={today} />
            <XPChart series={scoreSeries} />
          </div>

          <StudyHeatmap end={today} onSelect={setActiveDate} />
        </>
      )}

      <InsightList />
    </div>
  );
}

function formatTrend(t: number | null): string {
  if (t === null || t === 0) return '';
  return ` · ${t > 0 ? '+' : ''}${t}% vs previous`;
}

/* ------------------------------------------------------------------ */

interface DaySeriesPoint {
  date: ISODate;
  label: string;
  score: number | null;
  study: number;
  coding: number;
  tasks: number;
  xp: number;
  sleep: number | null;
}

function SubjectCharts({ from, to }: { from: ISODate; to: ISODate }) {
  const data = useData();
  const stats = useMemo(
    () =>
      subjectStats(data, from, to)
        .filter((s) => !s.subject.archived)
        .sort((a, b) => b.minutes - a.minutes),
    [data, from, to],
  );

  const withTime = stats.filter((s) => s.minutes > 0);
  const pieData = withTime.map((s) => ({
    name: s.subject.code,
    value: s.minutes,
    color: s.subject.color,
  }));
  const radarData = stats.map((s) => ({
    subject: s.subject.code,
    syllabus: s.topicProgress,
  }));

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card>
        <CardHeader title="Where the time went" subtitle="Study minutes by subject in this range" />
        {withTime.length === 0 ? (
          <p className="p-4 text-sm text-muted">No study sessions logged against a subject in this range.</p>
        ) : (
          <div className="h-64 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="rgb(var(--surface))"
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle()}
                  formatter={(v: number) => formatMinutes(v, { short: true })}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Syllabus coverage" subtitle="Share of topics ticked off, per subject" />
        {radarData.length < 3 ? (
          <div className="space-y-2 p-4">
            {radarData.length === 0 ? (
              <p className="text-sm text-muted">Add subjects and their topics to see coverage here.</p>
            ) : (
              radarData.map((r) => (
                <div key={r.subject} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-muted">{r.subject}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.syllabus}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right tabular text-ink">{r.syllabus}%</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="h-64 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgb(var(--line))" />
                <PolarAngleAxis dataKey="subject" tick={AXIS} />
                <Radar
                  name="Syllabus %"
                  dataKey="syllabus"
                  stroke="rgb(var(--accent))"
                  fill="rgb(var(--accent))"
                  fillOpacity={0.24}
                />
                <Tooltip contentStyle={tooltipStyle()} formatter={(v: number) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WeekdayChart() {
  const data = useData();
  const index = useIndex();
  const today = todayISO();

  const rows = useMemo(() => {
    const range = computeRangeMetrics(data, addDaysISO(today, -89), today, index);
    return weekdayAverages(data, range.days).map((r) => ({
      day: weekdayName(r.day, true),
      score: r.avgScore,
      count: r.count,
    }));
  }, [data, index, today]);

  const best = rows.filter((r) => r.count > 0).sort((a, b) => b.score - a.score)[0];

  return (
    <Card>
      <CardHeader
        title="Best day of the week"
        subtitle={
          best
            ? `${weekdayNameFull(best.day)} averages ${best.score} over the last 90 days`
            : 'Average score by weekday, last 90 days'
        }
      />
      <div className="h-56 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Bar dataKey="score" name="Avg score" radius={[3, 3, 0, 0]}>
              {rows.map((r) => (
                <Cell
                  key={r.day}
                  fill={best && r.day === best.day ? 'rgb(var(--accent))' : 'rgb(var(--accent) / 0.35)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function weekdayNameFull(short: string): string {
  const idx = [0, 1, 2, 3, 4, 5, 6].find((i) => weekdayName(i, true) === short);
  return idx === undefined ? short : weekdayName(idx);
}

function SleepChart({ series }: { series: DaySeriesPoint[] }) {
  const data = useData();
  const targetHours = Math.round((data.settings.targets.sleep / 60) * 10) / 10;
  const logged = series.filter((d) => d.sleep !== null);
  const avg = logged.length ? Math.round(mean(logged.map((d) => d.sleep as number)) * 10) / 10 : null;

  return (
    <Card>
      <CardHeader
        title="Sleep"
        subtitle={
          avg === null
            ? 'Log your sleep on the Today page to see this'
            : `${avg} h a night on average · your target is ${targetHours} h`
        }
      />
      {logged.length === 0 ? (
        <p className="p-4 text-sm text-muted">
          No sleep recorded in this range. It feeds the score, so logging it makes the score more accurate.
        </p>
      ) : (
        <div className="h-56 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis domain={[0, 12]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle()} formatter={(v: number) => `${v} h`} />
              <Line
                type="monotone"
                dataKey="sleep"
                name="Hours slept"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const SPLIT_KEYS = [
  { key: 'studyMinutes', label: 'Study', color: 'rgb(var(--c-study))' },
  { key: 'codingMinutes', label: 'Coding', color: 'rgb(var(--c-code))' },
  { key: 'collegeMinutes', label: 'College', color: 'rgb(var(--accent))' },
  { key: 'travelMinutes', label: 'Travel', color: 'rgb(var(--muted))' },
  { key: 'exerciseMinutes', label: 'Exercise', color: 'rgb(var(--c-exercise))' },
  { key: 'relationshipMinutes', label: 'Together', color: 'rgb(var(--c-danger))' },
  { key: 'socialMediaMinutes', label: 'Social media', color: 'rgb(var(--c-warn))' },
  { key: 'entertainmentMinutes', label: 'Entertainment', color: 'rgb(var(--faint))' },
] as const;

function TimeSplitChart({ from, to }: { from: ISODate; to: ISODate }) {
  const data = useData();
  const index = useIndex();
  const range = useMemo(() => computeRangeMetrics(data, from, to, index), [data, from, to, index]);

  const rows = SPLIT_KEYS.map((k) => ({
    name: k.label,
    value: sum(range.days.map((d) => d[k.key])),
    color: k.color,
  })).filter((r) => r.value > 0);

  const total = sum(rows.map((r) => r.value));

  return (
    <Card>
      <CardHeader
        title="How your waking hours split"
        subtitle={total === 0 ? 'Fill in the time allocation on the Today page' : `${formatMinutes(total)} accounted for`}
      />
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted">
          Nothing recorded in this range. The 24-hour allocation on the Today page feeds this chart.
        </p>
      ) : (
        <div className="space-y-2 p-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            {rows.map((r) => (
              <span
                key={r.name}
                className="h-full"
                style={{ width: `${(r.value / total) * 100}%`, background: r.color }}
                title={`${r.name} · ${formatMinutes(r.value, { short: true })}`}
              />
            ))}
          </div>
          <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                <span className="flex-1 truncate text-muted">{r.name}</span>
                <span className="tabular text-ink">{formatMinutes(r.value, { short: true })}</span>
                <span className="w-9 text-right tabular text-faint">{Math.round((r.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function XPChart({ series }: { series: DaySeriesPoint[] }) {
  const cumulative = useMemo(() => {
    let running = 0;
    return series.map((d) => {
      running += d.xp;
      return { label: d.label, xp: d.xp, total: running };
    });
  }, [series]);

  const earned = cumulative.length ? cumulative[cumulative.length - 1].total : 0;

  return (
    <Card>
      <CardHeader title="XP earned" subtitle={`${earned.toLocaleString()} XP in this range, day by day`} />
      <div className="h-56 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulative} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--c-warn))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(var(--c-warn))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Area
              type="monotone"
              dataKey="total"
              name="Cumulative XP"
              stroke="rgb(var(--c-warn))"
              strokeWidth={2}
              fill="url(#xpFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudyHeatmap({ end, onSelect }: { end: ISODate; onSelect: (d: ISODate) => void }) {
  const data = useData();

  const { cells, best } = useMemo(() => {
    const byDate = new Map<ISODate, number>();
    for (const s of data.studySessions) {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.minutes);
    }
    const peak = Math.max(60, ...byDate.values());
    const out: HeatmapCell[] = [];
    for (const [date, minutes] of byDate) {
      out.push({
        date,
        intensity: Math.min(1, minutes / peak),
        label: `${formatDateShort(date)} · ${formatMinutes(minutes, { short: true })} studied`,
      });
    }
    return { cells: out, best: peak };
  }, [data.studySessions]);

  const monthLabel = monthName(Number(end.slice(5, 7)) - 1, true);

  return (
    <Card>
      <CardHeader
        title="Study consistency"
        subtitle={`Last 12 months, up to ${monthLabel} · darkest day is ${formatMinutes(best, { short: true })}`}
      />
      <div className="p-4">
        <Heatmap
          cells={cells}
          end={end}
          weeks={53}
          tone="var(--c-study)"
          weekStartsOn={data.settings.weekStartsOn}
          onSelect={onSelect}
        />
      </div>
    </Card>
  );
}



