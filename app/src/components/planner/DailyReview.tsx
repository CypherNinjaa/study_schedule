import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { ISODate } from '@/types';
import { saveDailyReview, updateDailyLog } from '@/store/actions';
import { useIndex } from '@/hooks/useMetrics';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { XP_RULES } from '@/services/xp';
import { cn } from '@/utils/misc';

const MOODS = [1, 2, 3, 4, 5] as const;

/** End-of-day reflection. Two questions, deliberately small. */
export function DailyReview({ date }: { date: ISODate }) {
  const index = useIndex();
  const log = index.logs.get(date);
  const toast = useFeedbackStore((s) => s.toast);

  const [wentWell, setWentWell] = useState(log?.reviewWentWell ?? '');
  const [improve, setImprove] = useState(log?.reviewImprove ?? '');

  useEffect(() => {
    setWentWell(log?.reviewWentWell ?? '');
    setImprove(log?.reviewImprove ?? '');
  }, [date, log?.reviewWentWell, log?.reviewImprove]);

  const saved = log?.reviewedAt !== null && log?.reviewedAt !== undefined;
  const dirty = wentWell !== (log?.reviewWentWell ?? '') || improve !== (log?.reviewImprove ?? '');

  const save = () => {
    saveDailyReview(date, { wentWell: wentWell.trim(), improve: improve.trim() });
    toast({
      kind: 'success',
      title: saved ? 'Review updated' : 'Review saved',
      message: saved ? undefined : `+${XP_RULES.dailyReview} XP for reflecting on the day`,
    });
  };

  return (
    <Card>
      <CardHeader
        title="Daily review"
        subtitle={saved ? 'Saved — edit any time' : `Worth ${XP_RULES.dailyReview} XP, once per day`}
        action={saved ? <Check size={16} className="text-ok" /> : undefined}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="label mb-0 shrink-0">Mood</span>
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`Mood ${m} of 5`}
                aria-pressed={log?.mood === m}
                onClick={() => updateDailyLog(date, { mood: log?.mood === m ? null : m })}
                className={cn(
                  'h-8 w-8 rounded-ctl border text-xs font-semibold tabular transition-colors',
                  log?.mood === m
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:bg-elevated',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="label mb-0 shrink-0">Energy</span>
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`Energy ${m} of 5`}
                aria-pressed={log?.energy === m}
                onClick={() => updateDailyLog(date, { energy: log?.energy === m ? null : m })}
                className={cn(
                  'h-8 w-8 rounded-ctl border text-xs font-semibold tabular transition-colors',
                  log?.energy === m
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:bg-elevated',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">What went well</span>
          <textarea
            className="input min-h-[60px] resize-y"
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            placeholder="One thing is enough"
          />
        </label>
        <label className="block">
          <span className="label">What to do differently</span>
          <textarea
            className="input min-h-[60px] resize-y"
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder="Specific beats ambitious"
          />
        </label>
        <button
          type="button"
          className="btn-primary btn-sm w-full"
          onClick={save}
          disabled={!dirty && saved}
        >
          {saved ? (dirty ? 'Update review' : 'Saved') : 'Save review'}
        </button>
      </div>
    </Card>
  );
}
