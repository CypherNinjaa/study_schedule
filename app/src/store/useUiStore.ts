import { create } from 'zustand';
import type { ISODate, ThemeMode } from '@/types';
import { todayISO } from '@/utils/date';

export type RouteId =
  | 'dashboard'
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'study'
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
  /** quick-add dialog; when a date is passed the new task lands on that day */
  quickAddFor: ISODate | null;

  navigate: (route: RouteId) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  applyTheme: (mode: ThemeMode) => void;
  requestConfirm: (req: ConfirmRequest) => void;
  closeConfirm: () => void;
  openQuickAdd: (date?: ISODate | null) => void;
  closeQuickAdd: () => void;
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
  quickAddFor: null,

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
  openQuickAdd: (date = null) => set({ quickAddFor: date ?? todayISO() }),
  closeQuickAdd: () => set({ quickAddFor: null }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useUiStore.setState({ route: routeFromHash(), mobileNavOpen: false });
  });
}
