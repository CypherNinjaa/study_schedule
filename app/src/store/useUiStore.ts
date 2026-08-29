import { create } from 'zustand';
import type { ISODate, ThemeMode } from '@/types';
import { todayISO } from '@/utils/date';

export type RouteId =
  | 'dashboard'
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'study'
  | 'exams'
  | 'materials'
  | 'library'
  | 'habits'
  | 'goals'
  | 'analytics'
  | 'achievements'
  | 'timetable'
  | 'subjects'
  | 'settings';

export const ROUTES: RouteId[] = [
  'dashboard',
  'today',
  'calendar',
  'tasks',
  'study',
  'exams',
  'materials',
  'library',
  'habits',
  'goals',
  'analytics',
  'achievements',
  'timetable',
  'subjects',
  'settings',
];

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface UiState {
  route: RouteId;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  paletteOpen: boolean;
  /** resolved theme actually applied to the document */
  resolvedTheme: 'light' | 'dark';
  confirm: ConfirmRequest | null;
  /** quick-add dialog; the date the new task should land on */
  quickAddOpen: boolean;
  quickAddDate: ISODate | null;
  /** id of the task being edited, if any */
  taskEditorId: string | null;
  /** §44 weekly review modal */
  reviewOpen: boolean;

  navigate: (route: RouteId) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  applyTheme: (mode: ThemeMode) => void;
  requestConfirm: (req: ConfirmRequest) => void;
  closeConfirm: () => void;
  openQuickAdd: (date?: ISODate | null) => void;
  openTaskEditor: (taskId: string) => void;
  closeTaskDialogs: () => void;
  setReviewOpen: (open: boolean) => void;
}

const routeFromHash = (): RouteId => {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (ROUTES as string[]).includes(raw) ? (raw as RouteId) : 'dashboard';
};

const SIDEBAR_KEY = 'pos.sidebarCollapsed';

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useUiStore = create<UiState>((set, get) => ({
  route: typeof window === 'undefined' ? 'dashboard' : routeFromHash(),
  sidebarCollapsed:
    typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_KEY) === '1',
  mobileNavOpen: false,
  paletteOpen: false,
  resolvedTheme: prefersDark() ? 'dark' : 'light',
  confirm: null,
  quickAddOpen: false,
  quickAddDate: null,
  taskEditorId: null,
  reviewOpen: false,

  navigate: (route) => {
    if (window.location.hash !== `#/${route}`) window.location.hash = `#/${route}`;
    set({ route, mobileNavOpen: false, paletteOpen: false });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set({ paletteOpen: !get().paletteOpen }),

  applyTheme: (mode) => {
    const resolved = mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    set({ resolvedTheme: resolved });
  },

  requestConfirm: (req) => set({ confirm: req }),
  closeConfirm: () => set({ confirm: null }),
  openQuickAdd: (date = null) =>
    set({ quickAddOpen: true, quickAddDate: date ?? todayISO(), taskEditorId: null }),
  openTaskEditor: (taskId) => set({ taskEditorId: taskId, quickAddOpen: false }),
  closeTaskDialogs: () => set({ quickAddOpen: false, quickAddDate: null, taskEditorId: null }),
  setReviewOpen: (open) => set({ reviewOpen: open }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useUiStore.setState({ route: routeFromHash(), mobileNavOpen: false });
  });
}
