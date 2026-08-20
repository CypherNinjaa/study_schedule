import { useMemo } from 'react';
import { CheckCircle2, Code2, Flame, Sparkles, Timer, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useUiStore } from '@/store/useUiStore';
import { useData, useIndex } from '@/hooks/useMetrics';
import { Modal } from '@/components/ui/Modal';
import { computeWeeklyReview } from '@/services/weeklyReview';
import { addDaysISO, formatDateShort, formatMinutes, todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

/**
 * Reflects on the week just gone (§44). Opened from the command palette or the
 * dashboard banner. Every number is the user's own — nothing is invented.
 */
export function WeeklyReview() {
  const open = useUiStore((s) => s.reviewOpen);
  const setOpen = useUiStore((s) => s.setReviewOpen);
  const data = useData();
  const index = useIndex();

  // Review the previous week — the one that has actually finished.
  // No useMemo: this is a cheap string operation and must stay fresh.
  const anchor = addDaysISO(todayISO(), -7);
  const review = useMemo(
    () => computeWeeklyReview(data, anchor, index),
    [data, index, anchor],
  );

  if (!open) return null;

  const trendChip = (pct: number | null) => {
    if (pct === null || Math.abs(pct) < 5) return null;
    const up = pct > 0;
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-[11px]', up ? 'text-ok' : 'text-danger')}>
        {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {Math.abs(Math.round(pct))}%
      </span>
    );
  };

  return (
    <Modal
      open
      onClose={() => setOpen(false)}
      title="Your week in review"
      description={`${formatDateShort(review.from)} – ${formatDateShort(review.to)}`}
      size="lg"
      footer={
        <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
          Start the new week
        </button>
      }
    >
      {review.activeDays === 0 ? (
        <div className="py-6 text-center">
          <Sparkles size={22} className="mx-auto text-muted" />
          <p className="mt-2 text-sm text-ink">Nothing was tracked last week.</p>
          <p className="mt-1 text-xs text-muted">
            Log a session or tick a habit this week and your next review will have something to show.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReviewStat icon={<Trophy size={16} />} label="Avg score" value={String(Math.round(review.avgScore))} trend={trendChip(review.scoreTrendPct)} />
            <ReviewStat icon={<Timer size={16} />} label="Studied" value={formatMinutes(review.studyMinutes)} trend={trendChip(review.studyTrendPct)} />
            <ReviewStat icon={<Code2 size={16} />} label="Coded" value={formatMinutes(review.codingMinutes)} />
            <ReviewStat icon={<Flame size={16} />} label="XP earned" value={`+${review.xpEarned}`} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniFact label="Active days" value={`${review.activeDays}/7`} />
            <MiniFact label="Tasks done" value={`${review.tasksCompleted}/${review.tasksTotal}`} />
            <MiniFact label="Sessions" value={String(review.sessions)} />
          </div>

          {review.bestWeekday && (
            <p className="text-center text-xs text-muted">
              Your strongest day was <span className="font-medium text-ink">{review.bestWeekday}</span>.
            </p>
          )}

          {review.wins.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">What went well</p>
              <ul className="space-y-1.5">
                {review.wins.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
                    {w.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.watch.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">Worth a look</p>
              <ul className="space-y-1.5">
                {review.watch.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                    {w.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function ReviewStat({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: React.ReactNode }) {
  return (
    <div className="rounded-ctl border border-line bg-elevated p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1.5 text-lg font-semibold tabular text-ink">
        {value} {trend}
      </p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ctl bg-elevated px-2 py-2">
      <p className="text-sm font-semibold tabular text-ink">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
