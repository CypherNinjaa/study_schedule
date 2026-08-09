import { CalendarDays, CheckSquare, Home, User, X, BookOpen } from 'lucide-react';
import { useUiStore, type RouteId } from '@/store/useUiStore';
import { NAV } from './Sidebar';
import { cn } from '@/utils/misc';

const BOTTOM: { id: RouteId; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'settings', label: 'Profile', icon: User },
];

export function BottomNav() {
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {BOTTOM.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => navigate(id)}
          aria-current={route === id ? 'page' : undefined}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
            route === id ? 'text-accent' : 'text-muted',
          )}
        >
          <Icon size={20} />
          {label}
        </button>
      ))}
    </nav>
  );
}

/** Full nav drawer for the routes that don't fit in the bottom bar. */
export function MobileDrawer() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setOpen(false)} aria-hidden />
      <div className="relative flex h-full w-[264px] animate-slide-up flex-col border-r border-line bg-surface">
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <span className="text-sm font-semibold text-ink">Menu</span>
          <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="All sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(id)}
              className={cn('nav-item w-full', route === id && 'nav-item-active')}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
