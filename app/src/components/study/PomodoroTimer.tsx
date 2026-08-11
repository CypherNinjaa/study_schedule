import { useCallback, useEffect, useRef, useState } from 'react';
import { Coffee, Edit3, Minus, Pause, Play, Plus, RotateCcw, Settings as SettingsIcon, SkipForward } from 'lucide-react';
import type { StudyMethod } from '@/types';
import { logPomodoroRound, updateSettings } from '@/store/actions';
import { useData } from '@/hooks/useMetrics';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { Card, CardHeader, Ring } from '@/components/ui/Primitives';
import { XP_RULES } from '@/services/xp';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/misc';

type Phase = 'focus' | 'break' | 'longBreak';

const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  break: 'Short break',
  longBreak: 'Long break',
};

/** A short beep built from the Web Audio API — no asset, no network. */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    // Sound is a nicety; a blocked audio context must never break the timer.
  }
}

const FOCUS_PRESETS = [15, 25, 45, 50, 60];
const BREAK_PRESETS = [3, 5, 10, 15];
const LONG_BREAK_PRESETS = [10, 15, 20, 30];

export function PomodoroTimer() {
  const data = useData();
  const cfg = data.settings.pomodoro;
  const toast = useFeedbackStore((s) => s.toast);

  const [phase, setPhase] = useState<Phase>('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(cfg.focusMinutes * 60);
  const [completedFocus, setCompletedFocus] = useState(0);
  const [label, setLabel] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [method, setMethod] = useState<StudyMethod>('reading');
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const deadlineRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const lengthFor = useCallback(
    (p: Phase) =>
      (p === 'focus' ? cfg.focusMinutes : p === 'break' ? cfg.breakMinutes : cfg.longBreakMinutes) * 60,
    [cfg.focusMinutes, cfg.breakMinutes, cfg.longBreakMinutes],
  );

  const prevPhaseRef = useRef(phase);
  const prevLengthRef = useRef(lengthFor(phase));

  // Re-arm when phase changes, or when durations in settings change while idle.
  useEffect(() => {
    const newLength = lengthFor(phase);
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      prevLengthRef.current = newLength;
      setRemaining(newLength);
      return;
    }
    if (prevLengthRef.current !== newLength) {
      if (!running && remaining === prevLengthRef.current) {
        setRemaining(newLength);
      }
      prevLengthRef.current = newLength;
    }
  }, [phase, lengthFor, running, remaining]);

  const finish = useCallback(
    (p: Phase, minutes: number) => {
      const endedAt = new Date().toISOString();
      const startedAt = startedAtRef.current ?? endedAt;
      startedAtRef.current = null;

      logPomodoroRound({
        date: todayISO(),
        startedAt,
        endedAt,
        minutes,
        subjectId: subjectId || null,
        label: p === 'focus' ? label.trim() || 'Focus round' : PHASE_LABEL[p],
        method: p === 'focus' ? method : null,
        taskId: null,
        kind: p === 'focus' ? 'focus' : 'break',
      });

      if (cfg.soundEnabled) beep();

      if (p === 'focus') {
        const done = completedFocus + 1;
        setCompletedFocus(done);
        toast({
          kind: 'success',
          title: `Round ${done} done`,
          message: `${minutes} min logged as study time · +${XP_RULES.pomodoro} XP`,
        });
        const next: Phase = done % cfg.roundsBeforeLongBreak === 0 ? 'longBreak' : 'break';
        setPhase(next);
        setRemaining(lengthFor(next));
      } else {
        toast({ kind: 'info', title: 'Break over', message: 'Back to it when you are ready.' });
        setPhase('focus');
        setRemaining(lengthFor('focus'));
      }

      if (cfg.autoStartNext) {
        startedAtRef.current = new Date().toISOString();
        deadlineRef.current = null;
        setRunning(true);
      } else {
        setRunning(false);
        deadlineRef.current = null;
      }
    },
    [cfg.autoStartNext, cfg.roundsBeforeLongBreak, cfg.soundEnabled, completedFocus, label, lengthFor, method, subjectId, toast],
  );

  useEffect(() => {
    if (!running) return;
    if (deadlineRef.current === null) deadlineRef.current = Date.now() + remaining * 1000;
    if (startedAtRef.current === null) startedAtRef.current = new Date().toISOString();

    const total = lengthFor(phase);
    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.round(((deadlineRef.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(tick);
        deadlineRef.current = null;
        finish(phase, Math.round(total / 60));
      }
    }, 250);
    return () => window.clearInterval(tick);
    // `remaining` is intentionally omitted: it is the tick's output, not its input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, finish, lengthFor]);

  const total = lengthFor(phase);
  const progress = total === 0 ? 0 : (total - remaining) / total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  const toggle = () => {
    if (running) {
      // Pausing keeps the remaining seconds; the deadline is rebuilt on resume.
      deadlineRef.current = null;
      setRunning(false);
    } else {
      setRunning(true);
    }
  };

  const reset = () => {
    deadlineRef.current = null;
    startedAtRef.current = null;
    setRunning(false);
    setRemaining(lengthFor(phase));
  };

  const skip = () => {
    deadlineRef.current = null;
    startedAtRef.current = null;
    setRunning(false);
    const next: Phase = phase === 'focus' ? 'break' : 'focus';
    setPhase(next);
    setRemaining(lengthFor(next));
  };

  const adjustMinutes = (delta: number) => {
    const nextSec = Math.max(10, remaining + delta * 60);
    setRemaining(nextSec);
    if (running && deadlineRef.current !== null) {
      deadlineRef.current = deadlineRef.current + delta * 60 * 1000;
    }
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
