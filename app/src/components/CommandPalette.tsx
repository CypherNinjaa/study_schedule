import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  Download,
  FileJson,
  HelpCircle,
  Moon,
  PictureInPicture2,
  Plus,
  Save,
  Search,
  Sun,
  Target,
} from 'lucide-react';
import { usePomodoroStore } from '@/store/usePomodoroStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore, type RouteId } from '@/store/useUiStore';
import { NAV, openDocs } from '@/components/layout/nav';
import { updateSettings } from '@/store/actions';
import { relativeDayLabel } from '@/utils/date';
import { cn } from '@/utils/misc';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: typeof Search;
  run: () => void;
}

/**
 * Ctrl/Cmd+K palette. Everything reachable from the sidebar plus the actions
 * that would otherwise need two or three clicks, and a live search over your
 * own tasks, subjects and goals.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const navigate = useUiStore((s) => s.navigate);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const openTaskEditor = useUiStore((s) => s.openTaskEditor);
  const setReviewOpen = useUiStore((s) => s.setReviewOpen);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);

  const data = useDataStore((s) => s.data);
  const saveNow = useDataStore((s) => s.saveNow);
  const exportBackup = useDataStore((s) => s.exportBackup);
  const saveAsFile = useDataStore((s) => s.saveAs);
  const setActiveDate = useDataStore((s) => s.setActiveDate);

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Wait a frame so the input exists before focusing it.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    if (!data) return [];
    const go = (route: RouteId) => () => navigate(route);

    const nav: Command[] = NAV.map((n) => ({
      id: `nav:${n.id}`,
      label: n.label,
      hint: 'Go to page',
      group: 'Navigate',
      icon: n.icon,
      run: go(n.id),
    }));

    const actions: Command[] = [
      {
        id: 'act:new-task',
        label: 'New task',
        hint: 'Add something to your list',
        group: 'Create',
        icon: Plus,
        run: () => openQuickAdd(),
      },
      {
        id: 'act:log-study',
        label: 'Log a study session',
        group: 'Create',
        icon: BookOpen,
        run: go('study'),
      },
      {
        id: 'act:pip-timer',
        label: 'Toggle Picture-in-Picture Focus Timer',
        hint: 'Floating mini window',
        group: 'Study',
        icon: PictureInPicture2,
        run: () => usePomodoroStore.getState().requestPipToggle(),
      },
      { id: 'act:new-goal', label: 'New goal', group: 'Create', icon: Target, run: go('goals') },
      {
        id: 'act:weekly-review',
        label: 'Weekly review',
        hint: 'Reflect on last week',
        group: 'Create',
        icon: CalendarCheck,
        run: () => setReviewOpen(true),
      },
      {
        id: 'act:theme',
        label: resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Settings',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        run: () => updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }),
      },
      {
        id: 'act:save',
        label: 'Save now',
        hint: 'Ctrl+S',
        group: 'Data',
        icon: Save,
        run: () => void saveNow(),
      },
      {
        id: 'act:save-as',
        label: 'Save as…',
        group: 'Data',
        icon: FileJson,
        run: () => void saveAsFile(),
      },
      {
        id: 'act:export',
        label: 'Export a backup',
        hint: 'Downloads a JSON copy',
        group: 'Data',
        icon: Download,
        run: exportBackup,
      },
      {
        id: 'act:docs',
        label: 'Help & docs',
        hint: 'Opens documentation in a new tab',
        group: 'Help',
        icon: HelpCircle,
        run: openDocs,
      },
    ];

    const q = query.trim().toLowerCase();
    const found: Command[] = [];

    if (q.length >= 2) {
      for (const t of data.tasks) {
        if (found.length >= 6) break;
        if (t.status === 'completed' || !t.title.toLowerCase().includes(q)) continue;
        found.push({
          id: `task:${t.id}`,
          label: t.title,
          hint: relativeDayLabel(t.date),
          group: 'Your tasks',
          icon: CheckSquare,
          run: () => {
            setActiveDate(t.date);
            openTaskEditor(t.id);
          },
        });
      }
      for (const s of data.subjects) {
        if (found.length >= 10) break;
        if (s.archived) continue;
        if (!s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) continue;
        found.push({
          id: `subject:${s.id}`,
          label: `${s.code} · ${s.name}`,
          hint: 'Open subjects',
          group: 'Your subjects',
          icon: BookOpen,
          run: go('subjects'),
        });
      }
      for (const g of data.goals) {
        if (found.length >= 14) break;
        if (g.status !== 'active' || !g.title.toLowerCase().includes(q)) continue;
        found.push({
          id: `goal:${g.id}`,
          label: g.title,
          hint: 'Open goals',
          group: 'Your goals',
          icon: Target,
          run: go('goals'),
        });
      }
    }

    return [...found, ...nav, ...actions];
  }, [data, query, navigate, openQuickAdd, openTaskEditor, setReviewOpen, resolvedTheme, saveNow, saveAsFile, exportBackup, setActiveDate]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? commands.filter(
          (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
        )
      : commands;
    return list.slice(0, 24);
  }, [commands, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open || !data) return null;

  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (results.length === 0 ? 0 : (c - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAt(cursor);
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-scale-in w-full max-w-xl overflow-hidden rounded-panel border border-line bg-surface shadow-panel"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            placeholder="Search pages, tasks, subjects, actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
            aria-activedescendant={results[cursor] ? `cmd-${results[cursor].id}` : undefined}
            aria-controls="command-results"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint sm:block">
            Esc
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          <ul ref={listRef} id="command-results" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
            {results.map((c, i) => {
              const Icon = c.icon;
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              return (
                <li key={c.id}>
                  {showGroup && (
                    <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-faint">
                      {c.group}
                    </p>
                  )}
                  <button
                    type="button"
                    id={`cmd-${c.id}`}
                    role="option"
                    aria-selected={i === cursor}
                    data-active={i === cursor}
                    onMouseMove={() => setCursor(i)}
                    onClick={() => runAt(i)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-ctl px-2 py-2 text-left text-sm transition-colors',
                      i === cursor ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-elevated',
                    )}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="shrink-0 text-[11px] text-faint">{c.hint}</span>}
                    {i === cursor && <ArrowRight size={13} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[10px] text-faint">
          <span>↑↓ to move</span>
          <span>↵ to run</span>
          <span className="ml-auto">Everything stays on this device</span>
        </div>
      </div>
    </div>
  );
}
