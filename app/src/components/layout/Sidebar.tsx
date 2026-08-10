import { ChevronLeft, HelpCircle } from 'lucide-react';
import { useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { NAV, openDocs } from '@/components/layout/nav';
import { levelFromXP } from '@/services/xp';
import { cn } from '@/utils/misc';
import { ProgressBar } from '@/components/ui/Primitives';

export function Sidebar() {
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const xpTotal = useDataStore((s) => s.data?.xp.total ?? 0);
  const name = useDataStore((s) => s.data?.profile.name ?? '');

  const lvl = levelFromXP(xpTotal);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex',
        collapsed ? 'w-[68px]' : 'w-[228px]',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 border-b border-line px-3', collapsed && 'justify-center')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl bg-accent text-sm font-bold text-white">
          {name ? name.charAt(0).toUpperCase() : 'P'}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{name || 'Productivity OS'}</p>
            <p className="text-[11px] text-muted">Level {lvl.level}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(id)}
            aria-current={route === id ? 'page' : undefined}
            title={collapsed ? label : undefined}
            className={cn('nav-item w-full', collapsed && 'justify-center px-0', route === id && 'nav-item-active')}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={openDocs}
        title={collapsed ? 'Help & docs' : undefined}
        className={cn('nav-item mx-2 mb-1', collapsed && 'justify-center px-0')}
      >
        <HelpCircle size={18} className="shrink-0" />
        {!collapsed && <span className="truncate">Help &amp; docs</span>}
      </button>

      {!collapsed && (
        <div className="border-t border-line px-3 py-3">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink">Level {lvl.level}</span>
            <span className="tabular text-muted">
              {lvl.progressXP}/{lvl.levelSpanXP} XP
            </span>
          </div>
          <ProgressBar value={lvl.progress} label={`Level ${lvl.level} progress`} />
          <p className="mt-1.5 tabular text-[11px] text-muted">{xpTotal.toLocaleString()} XP total</p>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className="flex h-10 items-center justify-center border-t border-line text-muted hover:bg-elevated hover:text-ink"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
