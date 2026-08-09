import { useMemo, useState } from 'react';
import { Lock, Sparkles, Trophy } from 'lucide-react';
import { useData } from '@/hooks/useMetrics';
import { Card, CardHeader, PageHeader, ProgressBar, Ring, Segmented, StatCard } from '@/components/ui/Primitives';
import { Glyph } from '@/components/ui/Celebrations';
import { StreakCards } from '@/components/gamification/StreakCards';
import { levelFromXP, xpForLevel, xpInRange } from '@/services/xp';
import { addDaysISO, formatDateShort, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

const TIER_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  bronze: { ring: 'var(--c-warn)', chip: 'text-warn', label: 'Bronze' },
  silver: { ring: 'var(--muted)', chip: 'text-muted', label: 'Silver' },
  gold: { ring: 'var(--c-warn)', chip: 'text-warn', label: 'Gold' },
  platinum: { ring: 'var(--accent)', chip: 'text-accent', label: 'Platinum' },
};

const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'locked', label: 'In progress' },
];

export function Achievements() {
  const data = useData();
  const [filter, setFilter] = useState('all');
  const today = todayISO();

  const level = levelFromXP(data.xp.total);
  const unlocked = data.achievements.filter((a) => a.unlockedAt !== null);

  const shown = useMemo(() => {
    const list = data.achievements.filter((a) =>
      filter === 'unlocked' ? a.unlockedAt !== null : filter === 'locked' ? a.unlockedAt === null : true,
    );
    // Unlocked first by date, then locked by how close they are.
    return list.slice().sort((a, b) => {
      if (a.unlockedAt && b.unlockedAt) return b.unlockedAt.localeCompare(a.unlockedAt);
      if (a.unlockedAt) return -1;
      if (b.unlockedAt) return 1;
      return b.progress - a.progress;
    });
  }, [data.achievements, filter]);

  const weekXP = xpInRange(data, addDaysISO(today, -6), today);
  const nextUp = data.achievements
    .filter((a) => a.unlockedAt === null && a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Progress"
        subtitle={`Level ${level.level} · ${data.xp.total.toLocaleString()} XP · ${unlocked.length} of ${data.achievements.length} achievements`}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title={`Level ${level.level}`} subtitle="XP comes from work you actually recorded" />
          <div className="flex flex-col items-center gap-3 p-4">
            <Ring value={level.progress} size={150} stroke={11}>
              <span className="text-2xl font-semibold tabular text-ink">{level.level}</span>
              <span className="text-[11px] text-muted">
                {level.progressXP} / {level.levelSpanXP} XP
              </span>
            </Ring>
            <p className="text-center text-xs text-muted">
              {level.levelSpanXP - level.progressXP} XP to level {level.level + 1}
            </p>
            <div className="grid w-full grid-cols-3 gap-2 border-t border-line pt-3 text-center">
              <div>
                <p className="text-lg font-semibold tabular text-ink">{data.xp.total.toLocaleString()}</p>
                <p className="text-[11px] text-muted">Total XP</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular text-ink">{weekXP.toLocaleString()}</p>
                <p className="text-[11px] text-muted">This week</p>
              </div>
              <div>
                <p className="text-lg font-semibold tabular text-ink">{xpForLevel(level.level + 1).toLocaleString()}</p>
                <p className="text-[11px] text-muted">Next level at</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Streaks" subtitle="Derived from your history, so past edits stay honest" />
            <div className="p-3">
              <StreakCards compact />
            </div>
          </Card>

          <Card>
            <CardHeader title="Closest to unlocking" subtitle="Where a little more effort pays off" />
            {nextUp.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                Nothing in progress yet. Log some work and these start filling in.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {nextUp.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Glyph name={a.icon} size={20} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{a.name}</p>
                      <ProgressBar className="mt-1.5" value={a.progress} label={`${a.name} progress`} />
                    </div>
                    <span className="shrink-0 text-xs tabular text-muted">{Math.round(a.progress * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {TIERS.map((tier) => {
          const all = data.achievements.filter((a) => a.tier === tier);
          const got = all.filter((a) => a.unlockedAt !== null).length;
          return (
            <StatCard
              key={tier}
              icon={<Trophy size={18} />}
              label={TIER_STYLE[tier].label}
              value={`${got}/${all.length}`}
              hint="Unlocked"
              tone={TIER_STYLE[tier].ring}
            />
          );
        })}
      </div>

      <Segmented value={filter} onChange={setFilter} options={FILTERS} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((a) => {
          const isUnlocked = a.unlockedAt !== null;
          const style = TIER_STYLE[a.tier] ?? TIER_STYLE.bronze;
          return (
            <Card key={a.id} className={cn('p-4', !isUnlocked && 'opacity-80')}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                    isUnlocked ? 'border-transparent' : 'border-line',
                  )}
                  style={isUnlocked ? { background: `rgb(${style.ring} / 0.14)` } : undefined}
                >
                  {isUnlocked ? <Glyph name={a.icon} size={22} /> : <Lock size={16} className="text-faint" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                    <span className={cn('shrink-0 text-[10px] uppercase tracking-wide', style.chip)}>{a.tier}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{a.description}</p>
                  {isUnlocked ? (
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-ok">
                      <Sparkles size={11} /> Unlocked {formatDateShort(a.unlockedAt!.slice(0, 10))}
                    </p>
                  ) : (
                    <>
                      <ProgressBar className="mt-2" value={a.progress} label={`${a.name} progress`} />
                      <p className="mt-1 text-[11px] text-muted">{Math.round(a.progress * 100)}% there</p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Recent XP" subtitle="The last 30 awards, newest first" />
        {data.xp.entries.length === 0 ? (
          <p className="p-4 text-sm text-muted">No XP earned yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.xp.entries
              .slice(-30)
              .reverse()
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{e.label}</p>
                    <p className="text-[11px] text-muted">
                      {formatDateShort(e.date)} · {e.source.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular text-accent">+{e.amount}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
