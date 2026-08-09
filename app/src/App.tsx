import { lazy, Suspense, useEffect } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore, type RouteId } from '@/store/useUiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav, MobileDrawer } from '@/components/layout/MobileNav';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toaster, XPFloats } from '@/components/ui/Toaster';
import { AchievementToast, LevelUpOverlay } from '@/components/ui/Celebrations';
import { SkeletonPage } from '@/components/ui/Primitives';
import { CorruptedScreen } from '@/pages/CorruptedScreen';
import { Welcome } from '@/pages/Welcome';
import { QuickAddDialog } from '@/components/tasks/QuickAddDialog';
import { CommandPalette } from '@/components/CommandPalette';
import { Dashboard } from '@/pages/Dashboard';
import { Today } from '@/pages/Today';
import { Tasks } from '@/pages/Tasks';
import { Study } from '@/pages/Study';
import { Habits } from '@/pages/Habits';
import { Goals } from '@/pages/Goals';
import { Achievements } from '@/pages/Achievements';
import { Timetable } from '@/pages/Timetable';
import { Subjects } from '@/pages/Subjects';
import { Settings } from '@/pages/Settings';
import { Calendar } from '@/pages/Calendar';
import { addDaysISO, todayISO } from '@/utils/date';
import { materialiseRecurring } from '@/store/actions';

// Analytics pulls in Recharts, so it loads on demand.
const Analytics = lazy(() => import('@/pages/Analytics'));

const PAGES: Record<RouteId, React.ComponentType> = {
  dashboard: Dashboard,
  today: Today,
  calendar: Calendar,
  tasks: Tasks,
  study: Study,
  habits: Habits,
  goals: Goals,
  analytics: Analytics,
  achievements: Achievements,
  timetable: Timetable,
  subjects: Subjects,
  settings: Settings,
};

export default function App() {
  const bootPhase = useDataStore((s) => s.bootPhase);
  const boot = useDataStore((s) => s.boot);
  const corrupted = useDataStore((s) => s.corruptedMessage);
  const themeMode = useDataStore((s) => s.data?.settings.theme ?? 'system');
  const reduceMotion = useDataStore((s) => s.data?.settings.reduceMotion ?? false);
  const onboarded = useDataStore((s) => s.data?.profile.onboarded ?? false);
  const route = useUiStore((s) => s.route);
  const applyTheme = useUiStore((s) => s.applyTheme);
  const togglePalette = useUiStore((s) => s.togglePalette);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    applyTheme(themeMode);
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [themeMode, applyTheme]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
  }, [reduceMotion]);

  // Global shortcuts: Ctrl/Cmd+K palette, Ctrl/Cmd+S manual save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void useDataStore.getState().saveNow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePalette]);

  // Roll recurring templates forward, and follow the clock past midnight so a
  // tab left open overnight doesn't keep showing yesterday as "today".
  useEffect(() => {
    if (bootPhase !== 'ready') return;
    materialiseRecurring(todayISO(), addDaysISO(todayISO(), 60));
    const tick = window.setInterval(() => {
      const store = useDataStore.getState();
      const today = todayISO();
      if (store.activeDate === addDaysISO(today, -1)) store.setActiveDate(today);
    }, 60_000);
    return () => window.clearInterval(tick);
  }, [bootPhase]);

  if (corrupted) return <CorruptedScreen message={corrupted} />;

  if (bootPhase === 'booting') {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <div className="w-full max-w-3xl p-6">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  if (bootPhase === 'welcome' || !onboarded) return <Welcome />;

  const Page = PAGES[route] ?? Dashboard;

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      <Sidebar />
      <MobileDrawer />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-3 pb-24 pt-4 md:px-6 md:pb-8">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<SkeletonPage />}>
              <Page />
            </Suspense>
          </div>
        </main>
      </div>
      <BottomNav />

      <QuickAddDialog />
      <CommandPalette />
      <ConfirmDialog />
      <Toaster />
      <XPFloats />
      <AchievementToast />
      <LevelUpOverlay />
    </div>
  );
}
