import { useCallback, useEffect, useRef, useState } from 'react';
import { Coffee, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { StudyMethod } from '@/types';
import { logPomodoroRound } from '@/store/actions';
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

/**
 * Pomodoro timer. The countdown is derived from a wall-clock deadline rather
 * than counted down tick by tick, so a throttled background tab still finishes
 * at the right moment. A round is only written to the log when it completes in
 * full — skipping or resetting records nothing, which keeps Pomodoro XP honest.
 */
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

  const deadlineRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);

  const lengthFor = useCallback(
    (p: Phase) =>
      (p === 'focus' ? cfg.focusMinutes : p === 'break' ? cfg.breakMinutes : cfg.longBreakMinutes) * 60,
    [cfg.focusMinutes, cfg.breakMinutes, cfg.longBreakMinutes],
  );

  // Re-arm when the user changes the durations in settings while idle.
  useEffect(() => {
    if (!running) setRemaining(lengthFor(phase));
  }, [running, phase, lengthFor]);

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

  return (
    <Card>
      <CardHeader
        title="Pomodoro"
        subtitle={`${cfg.focusMinutes}/${cfg.breakMinutes} · long break every ${cfg.roundsBeforeLongBreak} rounds`}
        action={
          <span className="chip">
            {completedFocus} round{completedFocus === 1 ? '' : 's'} today
          </span>
        }
      />
      <div className="flex flex-col items-center gap-4 p-4">
        <Ring value={progress} size={168} stroke={10} tone={phase === 'focus' ? 'var(--accent)' : 'var(--c-ok)'}>
          <span className="text-3xl font-semibold tabular text-ink">
            {mm}:{ss}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {phase !== 'focus' && <Coffee size={12} />}
            {PHASE_LABEL[phase]}
          </span>
        </Ring>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary gap-1.5" onClick={toggle}>
            {running ? <Pause size={15} /> : <Play size={15} />}
            {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
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
