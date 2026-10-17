import { create } from 'zustand';
import type { StudyMethod } from '@/types';
import { logPomodoroRound } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { XP_RULES } from '@/services/xp';
import { todayISO } from '@/utils/date';
import { sideCannons } from '@/utils/confetti';

export type PomodoroPhase = 'focus' | 'break' | 'longBreak';

export const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: 'Focus',
  break: 'Short break',
  longBreak: 'Long break',
};

/* ------------------------------------------------------------------
   Audio helpers
------------------------------------------------------------------ */

/**
 * Play three ascending tones so the completion alert is clearly audible
 * even when the user is in deep focus on another app.
 */
function playCompletionChime(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tones: [number, number][] = [
      [660, 0],
      [880, 0.55],
      [1100, 1.1],
    ];
    tones.forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.7);
    });
    // Close context after all tones finish.
    window.setTimeout(() => void ctx.close(), 2500);
  } catch {
    // Audio is a nicety; must never break the timer.
  }
}

/** Blink the document title until the user interacts with the page. */
let _titleBlinkInterval: number | null = null;
function startTitleBlink(phase: PomodoroPhase): void {
  stopTitleBlink();
  const msg = phase === 'focus' ? 'Time is up!' : 'Break over!';
  let on = true;
  _titleBlinkInterval = window.setInterval(() => {
    document.title = on ? `${msg} - Study Schedule` : 'Study Schedule';
    on = !on;
  }, 1000);
  const stop = () => stopTitleBlink();
  window.addEventListener('focus', stop, { once: true });
  window.addEventListener('click', stop, { once: true });
}

function stopTitleBlink(): void {
  if (_titleBlinkInterval !== null) {
    window.clearInterval(_titleBlinkInterval);
    _titleBlinkInterval = null;
  }
  document.title = 'Study Schedule';
}

/** Fire a browser Notification if permission was granted. */
function notifyCompletion(phase: PomodoroPhase): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const title = phase === 'focus' ? 'Focus round done!' : 'Break over!';
    const body =
      phase === 'focus'
        ? 'Your session was logged. Time for a break.'
        : 'Ready to focus again when you are.';
    new Notification(title, {
      body,
      requireInteraction: true,
    });
  } catch {
    // Notifications are a nicety.
  }
}

/* ------------------------------------------------------------------
   Store
------------------------------------------------------------------ */

interface PomodoroStoreState {
  phase: PomodoroPhase;
  running: boolean;
  remaining: number;    // seconds left on the countdown
  /**
   * The configured session length set when the round started.
   * NEVER mutated by adjustMinutes — it always reflects the original
   * commitment so that elapsed time can be computed accurately.
   */
  scheduledTotal: number;
  /**
   * Display total used only for the ring-progress animation.
   * = Math.max(scheduledTotal, remaining) so the ring never goes backwards
   * when the user adds extra time.
   */
  displayTotal: number;
  completedFocus: number;
  label: string;
  subjectId: string;
  method: StudyMethod;
  deadline: number | null;   // epoch ms when the countdown expires
  startedAt: string | null;  // ISO instant when current run started
  minimized: boolean;
  /**
   * True between timer expiry and the first user interaction.
   * Used to keep the floating widget visible and show the alert pulse.
   */
  alerting: boolean;
  isPipActive: boolean;
  pipRequested: number;

  setPhase: (phase: PomodoroPhase) => void;
  setLabel: (label: string) => void;
  setSubjectId: (subjectId: string) => void;
  setMethod: (method: StudyMethod) => void;
  setMinimized: (minimized: boolean) => void;
  setPipActive: (active: boolean) => void;
  requestPipToggle: () => void;
  /** Used by PomodoroTimer to sync remaining when settings change while idle. */
  setRemaining: (remaining: number, total?: number) => void;
  /** Clear the alerting state — called on any user interaction after completion. */
  acknowledgeAlert: () => void;

  toggle: () => void;
  reset: (totalSeconds: number) => void;
  skip: (nextPhase: PomodoroPhase, nextSeconds: number) => void;
  adjustMinutes: (deltaMinutes: number) => void;
  /**
   * Save the elapsed portion of the current focus round, then stop.
   * Logs actual wall-clock minutes studied, not the configured duration.
   */
  submitEarly: () => void;
  tick: () => void;
}

export const usePomodoroStore = create<PomodoroStoreState>((set, get) => ({
  phase: 'focus',
  running: false,
  remaining: 25 * 60,
  scheduledTotal: 25 * 60,
  displayTotal: 25 * 60,
  completedFocus: 0,
  label: '',
  subjectId: '',
  method: 'reading',
  deadline: null,
  startedAt: null,
  minimized: false,
  alerting: false,
  isPipActive: false,
  pipRequested: 0,

  setPhase: (phase) => set({ phase }),
  setLabel: (label) => set({ label }),
  setSubjectId: (subjectId) => set({ subjectId }),
  setMethod: (method) => set({ method }),
  setMinimized: (minimized) => set({ minimized }),
  setPipActive: (isPipActive) => set({ isPipActive }),
  requestPipToggle: () => set((s) => ({ pipRequested: s.pipRequested + 1 })),

  setRemaining: (remaining, total) => {
    const next = total ?? remaining;
    set({
      remaining,
      scheduledTotal: next,
      displayTotal: Math.max(next, remaining),
    });
  },

  acknowledgeAlert: () => {
    stopTitleBlink();
    set({ alerting: false });
  },

  toggle: () => {
    const { running, remaining, scheduledTotal, alerting } = get();
    if (alerting) {
      stopTitleBlink();
      set({ alerting: false });
      return;
    }
    if (running) {
      set({ running: false, deadline: null });
    } else {
      const now = Date.now();
      const deadline = now + remaining * 1000;
      const startedAt = get().startedAt ?? new Date().toISOString();
      set({
        running: true,
        deadline,
        startedAt,
        scheduledTotal: Math.max(scheduledTotal, remaining),
        displayTotal: Math.max(scheduledTotal, remaining),
      });
    }
  },

  reset: (totalSeconds) => {
    stopTitleBlink();
    set({
      running: false,
      deadline: null,
      startedAt: null,
      remaining: totalSeconds,
      scheduledTotal: totalSeconds,
      displayTotal: totalSeconds,
      alerting: false,
    });
  },

  skip: (nextPhase, nextSeconds) => {
    stopTitleBlink();
    set({
      phase: nextPhase,
      running: false,
      deadline: null,
      startedAt: null,
      remaining: nextSeconds,
      scheduledTotal: nextSeconds,
      displayTotal: nextSeconds,
      alerting: false,
    });
  },

  adjustMinutes: (deltaMinutes) => {
    const { remaining, running, deadline } = get();
    const nextSec = Math.max(10, remaining + deltaMinutes * 60);
    const newDeadline =
      running && deadline !== null ? deadline + deltaMinutes * 60 * 1000 : deadline;
    // NOTE: scheduledTotal is intentionally NOT updated here.
    // It always reflects the original session commitment so elapsed time is correct.
    set({
      remaining: nextSec,
      displayTotal: Math.max(get().scheduledTotal, nextSec),
      deadline: newDeadline,
    });
  },

  submitEarly: () => {
    const { startedAt, phase, label, subjectId, method, scheduledTotal, running } = get();
    stopTitleBlink();

    if (phase !== 'focus' || (!running && !startedAt)) {
      // Nothing to log — just reset to scheduled start.
      set({
        running: false,
        deadline: null,
        startedAt: null,
        alerting: false,
        remaining: scheduledTotal,
        displayTotal: scheduledTotal,
      });
      return;
    }

    const endedAt = new Date().toISOString();
    const startMs = startedAt ? new Date(startedAt).getTime() : Date.now() - 60_000;
    const wallElapsed = Math.max(60, Math.round((Date.now() - startMs) / 1000));
    const timerElapsed = Math.max(60, get().displayTotal - get().remaining);
    const elapsedSeconds = Math.max(wallElapsed, timerElapsed);
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const logDate = useDataStore.getState().activeDate || todayISO();

    logPomodoroRound({
      date: logDate,
      startedAt: startedAt ?? new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      endedAt,
      minutes,
      subjectId: subjectId || null,
      label: label.trim() || 'Focus round',
      method,
      taskId: null,
      kind: 'focus',
    });

    useFeedbackStore.getState().toast({
      kind: 'success',
      title: `Session saved — ${minutes} min`,
      message: 'Partial session logged as study time.',
    });

    set({
      running: false,
      deadline: null,
      startedAt: null,
      alerting: false,
      remaining: scheduledTotal,
      displayTotal: scheduledTotal,
    });
  },

  tick: () => {
    const {
      running,
      deadline,
      phase,
      completedFocus,
      label,
      subjectId,
      method,
      startedAt,
      scheduledTotal,
      displayTotal,
    } = get();
    if (!running || deadline === null) return;

    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    set({ remaining: left });

    if (left === 0) {
      const endedAt = new Date().toISOString();

      // Log the committed session duration when the countdown finishes.
      const committedSeconds = Math.max(displayTotal, scheduledTotal, 60);
      const minutes = Math.max(1, Math.round(committedSeconds / 60));
      const logDate = useDataStore.getState().activeDate || todayISO();

      const appSettings = useDataStore.getState().data?.settings.pomodoro;
      const soundEnabled = appSettings?.soundEnabled ?? true;
      const autoStartNext = appSettings?.autoStartNext ?? false;
      const roundsBeforeLongBreak = appSettings?.roundsBeforeLongBreak ?? 4;
      const focusMinutes = appSettings?.focusMinutes ?? 25;
      const breakMinutes = appSettings?.breakMinutes ?? 5;
      const longBreakMinutes = appSettings?.longBreakMinutes ?? 15;

      const activeSubj = useDataStore
        .getState()
        .data?.subjects.find((s) => s.id === subjectId);
      const defaultTopic =
        label.trim() || (activeSubj ? `${activeSubj.name} — Focus round` : 'Focus round');

      logPomodoroRound({
        date: logDate,
        startedAt: startedAt ?? new Date(Date.now() - committedSeconds * 1000).toISOString(),
        endedAt,
        minutes,
        subjectId: subjectId || null,
        label: phase === 'focus' ? defaultTopic : PHASE_LABEL[phase],
        method: phase === 'focus' ? method : null,
        taskId: null,
        kind: phase === 'focus' ? 'focus' : 'break',
      });

      // Multi-layer completion alert.
      if (soundEnabled) playCompletionChime();
      notifyCompletion(phase);
      startTitleBlink(phase);

      const toast = useFeedbackStore.getState().toast;

      if (phase === 'focus') {
        const done = completedFocus + 1;
        const nextPhase: PomodoroPhase =
          done % roundsBeforeLongBreak === 0 ? 'longBreak' : 'break';
        const nextSec =
          (nextPhase === 'break' ? breakMinutes : longBreakMinutes) * 60;

        sideCannons();

        toast({
          kind: 'success',
          title: `Session auto-logged · ${minutes} min`,
          message: `Round ${done} completed · +${XP_RULES.pomodoro} Pomodoro XP`,
        });

        if (autoStartNext) {
          const now = Date.now();
          set({
            completedFocus: done,
            phase: nextPhase,
            remaining: nextSec,
            scheduledTotal: nextSec,
            displayTotal: nextSec,
            running: true,
            deadline: now + nextSec * 1000,
            startedAt: new Date().toISOString(),
            alerting: true,
          });
        } else {
          set({
            completedFocus: done,
            phase: nextPhase,
            remaining: nextSec,
            scheduledTotal: nextSec,
            displayTotal: nextSec,
            running: false,
            deadline: null,
            startedAt: null,
            alerting: true,
          });
        }
      } else {
        const nextSec = focusMinutes * 60;
        toast({ kind: 'info', title: 'Break over', message: 'Back to it when you are ready.' });

        if (autoStartNext) {
          const now = Date.now();
          set({
            phase: 'focus',
            remaining: nextSec,
            scheduledTotal: nextSec,
            displayTotal: nextSec,
            running: true,
            deadline: now + nextSec * 1000,
            startedAt: new Date().toISOString(),
            alerting: true,
          });
        } else {
          set({
            phase: 'focus',
            remaining: nextSec,
            scheduledTotal: nextSec,
            displayTotal: nextSec,
            running: false,
            deadline: null,
            startedAt: null,
            alerting: true,
          });
        }
      }
    }
  },
}));
