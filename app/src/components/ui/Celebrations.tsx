import { useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { xpForLevel } from '@/services/xp';
import { cn } from '@/utils/misc';

const TIER_RING: Record<string, string> = {
  bronze: 'from-amber-500/25 to-amber-500/5 text-amber-500',
  silver: 'from-slate-400/25 to-slate-400/5 text-slate-400',
  gold: 'from-yellow-400/25 to-yellow-400/5 text-yellow-500',
  platinum: 'from-cyan-400/25 to-cyan-400/5 text-cyan-400',
};

/** Resolves a Lucide icon by name, falling back to a trophy. */
export function LucideIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const map = Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const Cmp = map[name] ?? Icons.Trophy;
  return <Cmp size={size} className={className} />;
}

/**
 * Icons come from data the user can edit, so they may be either a Lucide name
 * ("Dumbbell") or a plain emoji. Emoji render as text; names resolve to Lucide.
 */
export function Glyph({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const isLucideName = /^[A-Z][A-Za-z0-9]*$/.test(name);
  if (isLucideName) return <LucideIcon name={name} size={size} className={className} />;
  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {name}
    </span>
  );
}

export function LevelUpOverlay() {
  const level = useFeedbackStore((s) => s.levelUp);
  const dismiss = useFeedbackStore((s) => s.dismissLevelUp);

  useEffect(() => {
    if (level === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    document.addEventListener('keydown', onKey);
    const timer = window.setTimeout(dismiss, 6000);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [level, dismiss]);

  if (level === null) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-live="polite">
      <div className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" onClick={dismiss} aria-hidden />
      <div className="relative w-full max-w-sm animate-pop rounded-card border border-line bg-surface p-8 text-center shadow-pop">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-accent/25 to-accent/5">
          <Sparkles size={34} className="text-accent" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted">Level up</p>
        <p className="mt-1 text-4xl font-bold tabular text-ink">Level {level}</p>
        <p className="mt-3 text-sm text-muted">
          Next level at {xpForLevel(level + 1).toLocaleString()} XP. Keep the streak going.
        </p>
        <button type="button" className="btn-primary mt-6 w-full" onClick={dismiss} data-autofocus>
          Nice
        </button>
      </div>
    </div>
  );
}

export function AchievementToast() {
  const queue = useFeedbackStore((s) => s.achievementQueue);
  const dismiss = useFeedbackStore((s) => s.dismissAchievement);
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(dismiss, 5200);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[75] flex justify-center px-4">
      <button
        type="button"
        onClick={dismiss}
        className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-4 rounded-card border border-line bg-elevated px-4 py-3 text-left shadow-pop"
      >
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b',
            TIER_RING[current.tier] ?? TIER_RING.bronze,
          )}
        >
          <Glyph name={current.icon} size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Achievement unlocked{queue.length > 1 ? ` · ${queue.length - 1} more` : ''}
          </p>
          <p className="truncate text-sm font-semibold text-ink">{current.name}</p>
          <p className="truncate text-xs text-muted">{current.description}</p>
        </div>
      </button>
    </div>
  );
}
