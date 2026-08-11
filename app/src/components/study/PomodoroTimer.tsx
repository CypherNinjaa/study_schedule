import { useEffect, useRef, useState } from 'react';
import { Coffee, Edit3, Minus, Pause, Play, Plus, RotateCcw, Settings as SettingsIcon, SkipForward } from 'lucide-react';
import type { StudyMethod } from '@/types';
import { updateSettings } from '@/store/actions';
import { usePomodoroStore, PHASE_LABEL, type PomodoroPhase } from '@/store/usePomodoroStore';
import { useData } from '@/hooks/useMetrics';
import { Card, CardHeader, Ring } from '@/components/ui/Primitives';
import { cn } from '@/utils/misc';

const FOCUS_PRESETS = [15, 25, 45, 50, 60];
const BREAK_PRESETS = [3, 5, 10, 15];
const LONG_BREAK_PRESETS = [10, 15, 20, 30];

export function PomodoroTimer() {
  const data = useData();
  const cfg = data.settings.pomodoro;

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const completedFocus = usePomodoroStore((s) => s.completedFocus);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const method = usePomodoroStore((s) => s.method);

  const setLabel = usePomodoroStore((s) => s.setLabel);
  const setSubjectId = usePomodoroStore((s) => s.setSubjectId);
  const setMethod = usePomodoroStore((s) => s.setMethod);
  const setRemaining = usePomodoroStore((s) => s.setRemaining);

  const toggle = usePomodoroStore((s) => s.toggle);
  const resetStore = usePomodoroStore((s) => s.reset);
  const skipStore = usePomodoroStore((s) => s.skip);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);

  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const total = (phase === 'focus' ? cfg.focusMinutes : phase === 'break' ? cfg.breakMinutes : cfg.longBreakMinutes) * 60;
  const progress = total === 0 ? 0 : (total - remaining) / total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const prevPhaseRef = useRef(phase);
  const prevTotalRef = useRef(total);

  // Sync remaining time when phase or default settings change while idle
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      prevTotalRef.current = total;
      setRemaining(total);
      return;
    }
    if (prevTotalRef.current !== total) {
      if (!running && remaining === prevTotalRef.current) {
        setRemaining(total);
      }
      prevTotalRef.current = total;
    }
  }, [phase, total, running, remaining, setRemaining]);

  const reset = () => {
    resetStore(total);
  };

  const skip = () => {
    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus';
    const nextSec = (nextPhase === 'focus' ? cfg.focusMinutes : cfg.breakMinutes) * 60;
    skipStore(nextPhase, nextSec);
  };

  const updatePomodoroSetting = (patch: Partial<typeof cfg>) => {
    updateSettings({ pomodoro: { ...cfg, ...patch } });
  };

  return (
    <Card>
      <CardHeader
        title="Pomodoro"
        subtitle={`${cfg.focusMinutes}/${cfg.breakMinutes} · long break every ${cfg.roundsBeforeLongBreak} rounds`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'btn-ghost btn-xs gap-1',
                isEditingSettings && 'bg-accent-soft text-accent',
              )}
              onClick={() => setIsEditingSettings(!isEditingSettings)}
              title="Edit timer durations and presets"
            >
              <Edit3 size={13} /> Edit timer
            </button>
            <span className="chip">
              {completedFocus} round{completedFocus === 1 ? '' : 's'} today
            </span>
          </div>
        }
      />
      <div className="flex flex-col items-center gap-4 p-4">
        {isEditingSettings && (
          <div className="w-full rounded-ctl border border-line bg-surface p-3 space-y-3 text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-line pb-2 font-medium text-ink">
              <span className="flex items-center gap-1.5"><SettingsIcon size={14} className="text-accent" /> Edit Durations</span>
              <button
                type="button"
                className="text-muted hover:text-ink text-[11px]"
                onClick={() => setIsEditingSettings(false)}
              >
                Close
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block label">Focus (min)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  className="input input-sm tabular"
                  value={cfg.focusMinutes}
                  onChange={(e) => updatePomodoroSetting({ focusMinutes: Math.max(1, Number(e.target.value) || 25) })}
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {FOCUS_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                        cfg.focusMinutes === m
                          ? 'border-accent bg-accent-soft text-accent font-semibold'
                          : 'border-line text-muted hover:bg-elevated',
                      )}
                      onClick={() => updatePomodoroSetting({ focusMinutes: m })}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block label">Short Break (min)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="input input-sm tabular"
                  value={cfg.breakMinutes}
                  onChange={(e) => updatePomodoroSetting({ breakMinutes: Math.max(1, Number(e.target.value) || 5) })}
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {BREAK_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                        cfg.breakMinutes === m
                          ? 'border-accent bg-accent-soft text-accent font-semibold'
                          : 'border-line text-muted hover:bg-elevated',
                      )}
                      onClick={() => updatePomodoroSetting({ breakMinutes: m })}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block label">Long Break (min)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="input input-sm tabular"
                  value={cfg.longBreakMinutes}
                  onChange={(e) => updatePomodoroSetting({ longBreakMinutes: Math.max(1, Number(e.target.value) || 15) })}
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {LONG_BREAK_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                        cfg.longBreakMinutes === m
                          ? 'border-accent bg-accent-soft text-accent font-semibold'
                          : 'border-line text-muted hover:bg-elevated',
                      )}
                      onClick={() => updatePomodoroSetting({ longBreakMinutes: m })}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <Ring value={progress} size={168} stroke={10} tone={phase === 'focus' ? 'var(--accent)' : 'var(--c-ok)'}>
          <span className="text-3xl font-semibold tabular text-ink">
            {mm}:{ss}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {phase !== 'focus' && <Coffee size={12} />}
            {PHASE_LABEL[phase]}
          </span>
        </Ring>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-outline btn-xs gap-1 text-muted"
            onClick={() => adjustMinutes(-5)}
            title="Subtract 5 minutes from remaining session"
          >
            <Minus size={13} /> 5m
          </button>

          <button type="button" className="btn-primary gap-1.5" onClick={toggle}>
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
          </button>

          <button
            type="button"
            className="btn-outline btn-xs gap-1 text-muted"
            onClick={() => adjustMinutes(5)}
            title="Add 5 minutes to remaining session"
          >
            <Plus size={13} /> 5m
          </button>

          <button type="button" className="btn-outline gap-1.5" onClick={reset} disabled={remaining === total && !running}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" className="btn-ghost gap-1.5" onClick={skip} title="Skip without logging the round">
            <SkipForward size={15} /> Skip
          </button>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className="label">What are you working on</span>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Java collections — practice problems"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Subject</span>
            <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">No subject</option>
              {data.subjects
                .filter((s) => !s.archived)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Method</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as StudyMethod)}>
              {(['reading', 'practice', 'revision', 'problem_solving', 'coding', 'flashcards'] as StudyMethod[]).map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className={cn('text-center text-[11px] leading-relaxed text-muted')}>
          A round is logged as study time only when the timer runs to the end. Skipping or resetting records nothing.
        </p>
      </div>
    </Card>
  );
}
