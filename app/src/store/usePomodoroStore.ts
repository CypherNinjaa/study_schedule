import { create } from 'zustand';
import type { StudyMethod } from '@/types';
import { logPomodoroRound } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { XP_RULES } from '@/services/xp';
import { todayISO } from '@/utils/date';

export type PomodoroPhase = 'focus' | 'break' | 'longBreak';

export const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: 'Focus',
  break: 'Short break',
  longBreak: 'Long break',
};

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
    // Sound is a nicety; AudioContext block must not break timer
  }
}

interface PomodoroStoreState {
  phase: PomodoroPhase;
  running: boolean;
  remaining: number; // in seconds
  initialTotal: number; // max/initial duration in seconds for progress calculation
  completedFocus: number;
  label: string;
  subjectId: string;
  method: StudyMethod;
  deadline: number | null;
  startedAt: string | null;
  minimized: boolean;

  setPhase: (phase: PomodoroPhase) => void;
  setLabel: (label: string) => void;
  setSubjectId: (subjectId: string) => void;
  setMethod: (method: StudyMethod) => void;
  setMinimized: (minimized: boolean) => void;
  setRemaining: (remaining: number, total?: number) => void;

  toggle: () => void;
  reset: (totalSeconds: number) => void;
  skip: (nextPhase: PomodoroPhase, nextSeconds: number) => void;
  adjustMinutes: (deltaMinutes: number) => void;
  tick: (totalSeconds: number) => void;
}

export const usePomodoroStore = create<PomodoroStoreState>((set, get) => ({
  phase: 'focus',
  running: false,
  remaining: 25 * 60,
  initialTotal: 25 * 60,
  completedFocus: 0,
  label: '',
  subjectId: '',
  method: 'reading',
  deadline: null,
  startedAt: null,
  minimized: false,

  setPhase: (phase) => set({ phase }),
  setLabel: (label) => set({ label }),
  setSubjectId: (subjectId) => set({ subjectId }),
  setMethod: (method) => set({ method }),
  setMinimized: (minimized) => set({ minimized }),
  setRemaining: (remaining, total) =>
    set({
      remaining,
      initialTotal: total ?? Math.max(get().initialTotal, remaining),
    }),

  toggle: () => {
    const { running, remaining, initialTotal } = get();
    if (running) {
      set({ running: false, deadline: null });
    } else {
      const now = Date.now();
      const deadline = now + remaining * 1000;
      // Record fresh start time if starting a new round or resuming
      const startedAt = get().startedAt ?? new Date().toISOString();
      const currentInitial = Math.max(initialTotal, remaining);
      set({ running: true, deadline, startedAt, initialTotal: currentInitial });
    }
  },

  reset: (totalSeconds) => {
    set({
      running: false,
      deadline: null,
      startedAt: null,
      remaining: totalSeconds,
      initialTotal: totalSeconds,
    });
  },

  skip: (nextPhase, nextSeconds) => {
    set({
      phase: nextPhase,
      running: false,
      deadline: null,
      startedAt: null,
      remaining: nextSeconds,
      initialTotal: nextSeconds,
    });
  },

  adjustMinutes: (deltaMinutes) => {
    const { remaining, running, deadline, initialTotal } = get();
    const nextSec = Math.max(10, remaining + deltaMinutes * 60);
    const newDeadline = running && deadline !== null ? deadline + deltaMinutes * 60 * 1000 : deadline;
    set({
      remaining: nextSec,
      initialTotal: Math.max(initialTotal, nextSec),
      deadline: newDeadline,
    });
  },

  tick: (totalSeconds) => {
    const { running, deadline, phase, completedFocus, label, subjectId, method, startedAt, initialTotal } = get();
    if (!running || deadline === null) return;

    const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    set({ remaining: left });

    if (left === 0) {
      const endedAt = new Date().toISOString();
      const startTime = startedAt ?? new Date(Date.now() - (initialTotal || totalSeconds) * 1000).toISOString();
      
      // Compute actual minutes from initialTotal instead of hardcoded 25m
      const roundSec = initialTotal > 0 ? initialTotal : totalSeconds;
      const minutes = Math.max(1, Math.round(roundSec / 60));

      const appSettings = useDataStore.getState().data?.settings.pomodoro;
      const soundEnabled = appSettings?.soundEnabled ?? true;
      const autoStartNext = appSettings?.autoStartNext ?? false;
      const roundsBeforeLongBreak = appSettings?.roundsBeforeLongBreak ?? 4;
      const focusMinutes = appSettings?.focusMinutes ?? 25;
      const breakMinutes = appSettings?.breakMinutes ?? 5;
      const longBreakMinutes = appSettings?.longBreakMinutes ?? 15;

      logPomodoroRound({
        date: todayISO(),
        startedAt: startTime,
        endedAt,
        minutes,
        subjectId: subjectId || null,
        label: phase === 'focus' ? label.trim() || 'Focus round' : PHASE_LABEL[phase],
        method: phase === 'focus' ? method : null,
        taskId: null,
        kind: phase === 'focus' ? 'focus' : 'break',
      });

      if (soundEnabled) beep();

      const toast = useFeedbackStore.getState().toast;

      if (phase === 'focus') {
        const done = completedFocus + 1;
        const nextPhase: PomodoroPhase = done % roundsBeforeLongBreak === 0 ? 'longBreak' : 'break';
        const nextSec = (nextPhase === 'break' ? breakMinutes : longBreakMinutes) * 60;

        toast({
          kind: 'success',
          title: `Round ${done} done`,
          message: `${minutes} min logged as study time · +${XP_RULES.pomodoro} XP`,
        });

        if (autoStartNext) {
          const now = Date.now();
          set({
            completedFocus: done,
            phase: nextPhase,
            remaining: nextSec,
            initialTotal: nextSec,
            running: true,
            deadline: now + nextSec * 1000,
            startedAt: new Date().toISOString(),
          });
        } else {
          set({
            completedFocus: done,
            phase: nextPhase,
            remaining: nextSec,
            initialTotal: nextSec,
            running: false,
            deadline: null,
            startedAt: null,
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
            initialTotal: nextSec,
            running: true,
            deadline: now + nextSec * 1000,
            startedAt: new Date().toISOString(),
          });
        } else {
          set({
            phase: 'focus',
            remaining: nextSec,
            initialTotal: nextSec,
            running: false,
            deadline: null,
            startedAt: null,
          });
        }
      }
    }
  },
}));
