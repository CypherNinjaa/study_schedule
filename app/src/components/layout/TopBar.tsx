import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  Loader2,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import { useDataStore, type SaveState } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { updateSettings } from '@/store/actions';
import { NAV } from './nav';
import { cn } from '@/utils/misc';

const SAVE_LABEL: Record<SaveState, string> = {
  idle: 'Up to date',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
  disconnected: 'File disconnected',
  error: 'Save failed',
};

function SaveIndicator() {
  const saveState = useDataStore((s) => s.saveState);
  const fileName = useDataStore((s) => s.fileName);
  const storageMode = useDataStore((s) => s.storageMode);
  const reconnect = useDataStore((s) => s.reconnectFile);
  const connect = useDataStore((s) => s.connectNewFile);

  if (saveState === 'disconnected') {
    return (
      <button type="button" onClick={() => void reconnect()} className="btn-outline btn-sm gap-1.5 text-warn">
        <CloudOff size={14} />
        <span className="hidden sm:inline">Local file disconnected</span>
        <span className="font-semibold underline">Reconnect</span>
      </button>
    );
  }

  if (saveState === 'error') {
    return (
      <span className="chip gap-1.5 border-danger/40 text-danger" title="Your data is still kept in this browser.">
        <AlertCircle size={13} /> Save failed
      </span>
    );
  }

  if (storageMode !== 'file') {
    return (
      <button type="button" onClick={() => void connect()} className="btn-ghost btn-sm gap-1.5" title="Save to a JSON file on your computer">
        <Cloud size={14} /> <span className="hidden sm:inline">Browser only</span>
        <span className="font-semibold text-accent">Create data file</span>
      </button>
    );
  }

  return (
    <span className="chip gap-1.5" title={fileName ? `Autosaving to ${fileName}` : undefined}>
      {saveState === 'saving' ? (
        <Loader2 size={13} className="animate-spin" />
      ) : saveState === 'dirty' ? (
        <Cloud size={13} className="text-muted" />
      ) : (
        <Check size={13} className="text-ok" />
      )}
      <span className="hidden sm:inline">{SAVE_LABEL[saveState]}</span>
    </span>
  );
}

export function TopBar() {
  const route = useUiStore((s) => s.route);
  const setMobileNav = useUiStore((s) => s.setMobileNavOpen);
  const openPalette = useUiStore((s) => s.togglePalette);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const theme = useDataStore((s) => s.data?.settings.theme ?? 'system');
  const resolved = useUiStore((s) => s.resolvedTheme);

  const title = NAV.find((n) => n.id === route)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur md:px-5">
      <button type="button" className="btn-icon md:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu">
        <Menu size={18} />
      </button>

      <h1 className="truncate text-base font-semibold text-ink">{title}</h1>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <SaveIndicator />

        <button
          type="button"
          onClick={openPalette}
          className={cn(
            'hidden items-center gap-2 rounded-ctl border border-line bg-surface px-2.5 py-1.5',
            'text-xs text-muted transition-colors hover:bg-elevated hover:text-ink sm:flex',
          )}
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span>Search</span>
          <kbd className="rounded border border-line px-1 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
        </button>

        <button
          type="button"
          className="btn-icon"
          aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => updateSettings({ theme: resolved === 'dark' ? 'light' : 'dark' })}
          title={theme === 'system' ? 'Following your system theme' : undefined}
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button type="button" className="btn-primary btn-sm gap-1.5" onClick={() => openQuickAdd()}>
          <Plus size={15} />
          <span className="hidden sm:inline">New task</span>
        </button>
      </div>
    </header>
  );
}
