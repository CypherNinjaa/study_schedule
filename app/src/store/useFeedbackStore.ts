import { create } from 'zustand';
import { uid } from '@/utils/misc';
import type { UnlockedAchievement } from '@/services/achievements';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  /** ms; 0 keeps it until dismissed */
  duration: number;
  action?: { label: string; run: () => void };
}

export interface XPFloat {
  id: string;
  amount: number;
  label: string;
}

interface FeedbackState {
  toasts: Toast[];
  xpFloats: XPFloat[];
  levelUp: number | null;
  achievementQueue: UnlockedAchievement[];

  toast: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismissToast: (id: string) => void;
  floatXP: (amount: number, label: string) => void;
  clearXPFloat: (id: string) => void;
  showLevelUp: (level: number) => void;
  dismissLevelUp: () => void;
  queueAchievements: (list: UnlockedAchievement[]) => void;
  dismissAchievement: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  toasts: [],
  xpFloats: [],
  levelUp: null,
  achievementQueue: [],

  toast: (t) => {
    const id = uid('toast');
    const toast: Toast = { duration: 3800, ...t, id };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (toast.duration > 0) {
      setTimeout(() => get().dismissToast(id), toast.duration);
    }
    return id;
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  floatXP: (amount, label) => {
    if (amount === 0) return;
    const float: XPFloat = { id: uid('xpf'), amount, label };
    set((s) => ({ xpFloats: [...s.xpFloats, float] }));
    setTimeout(() => get().clearXPFloat(float.id), 1700);
  },

  clearXPFloat: (id) => set((s) => ({ xpFloats: s.xpFloats.filter((f) => f.id !== id) })),

  showLevelUp: (level) => set({ levelUp: level }),
  dismissLevelUp: () => set({ levelUp: null }),

  queueAchievements: (list) =>
    set((s) => (list.length ? { achievementQueue: [...s.achievementQueue, ...list] } : s)),
  dismissAchievement: () => set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),
}));
