import { useEffect } from 'react';
import { Coffee, Maximize2, Minimize2, Minus, Pause, Play, Plus, ExternalLink } from 'lucide-react';
import { usePomodoroStore, PHASE_LABEL } from '@/store/usePomodoroStore';
import { useUiStore } from '@/store/useUiStore';
import { useData } from '@/hooks/useMetrics';
import { cn } from '@/utils/misc';

export function FloatingPomodoroWidget() {
  const data = useData();
  const cfg = data.settings.pomodoro;
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const minimized = usePomodoroStore((s) => s.minimized);
  
  const toggle = usePomodoroStore((s) => s.toggle);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);
  const setMinimized = usePomodoroStore((s) => s.setMinimized);
  const tick = usePomodoroStore((s) => s.tick);

  const total = (phase === 'focus' ? cfg.focusMinutes : phase === 'break' ? cfg.breakMinutes : cfg.longBreakMinutes) * 60;

  // Global tick interval engine
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      tick();
    }, 250);
    return () => window.clearInterval(interval);
  }, [running, tick]);

  // Update Document Title with active countdown
  useEffect(() => {
    if (!running) {
      document.title = 'Study Schedule';
      return;
    }
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    document.title = `(${mm}:${ss}) ${PHASE_LABEL[phase]} · Study Schedule`;
    return () => {
      document.title = 'Study Schedule';
    };
  }, [running, remaining, phase]);

  // Show floating widget if timer is active/running and we are NOT on the study page, or if minimized
  const isSessionActive = running || remaining < total;
  const shouldDisplay = isSessionActive && route !== 'study';

  if (!shouldDisplay) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const subject = data.subjects.find((s) => s.id === subjectId);

  if (minimized) {
    return (
      <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 animate-fade-in">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className={cn(
            'flex items-center gap-2 rounded-full border border-line px-3.5 py-2 shadow-pop backdrop-blur-md transition-all hover:scale-105',
            phase === 'focus' ? 'bg-surface/95 text-accent border-accent/40' : 'bg-surface/95 text-ok border-ok/40',
          )}
          title="Expand Pomodoro Timer Widget"
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            {running && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', phase === 'focus' ? 'bg-accent' : 'bg-ok')} />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', phase === 'focus' ? 'bg-accent' : 'bg-ok')} />
          </span>
          <span className="text-xs font-semibold tabular text-ink">
            {mm}:{ss}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {PHASE_LABEL[phase]}
          </span>
          <Maximize2 size={13} className="ml-1 text-muted hover:text-ink" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-pop backdrop-blur-md md:bottom-6 md:right-6 animate-slide-up">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-1.5">
          {phase !== 'focus' && <Coffee size={13} className="text-ok" />}
          <span className={cn('text-xs font-bold uppercase tracking-wider', phase === 'focus' ? 'text-accent' : 'text-ok')}>
            {PHASE_LABEL[phase]}
          </span>
          {subject && (
            <span className="truncate max-w-[90px] text-[10px] text-muted rounded bg-elevated px-1.5 py-0.5">
              {subject.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-icon h-6 w-6 text-muted hover:text-ink"
            onClick={() => navigate('study')}
            title="Go to full Study page"
          >
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            className="btn-icon h-6 w-6 text-muted hover:text-ink"
            onClick={() => setMinimized(true)}
            title="Minimize widget"
          >
            <Minimize2 size={13} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold tabular text-ink leading-none">
            {mm}:{ss}
          </p>
          <p className="mt-1 max-w-[140px] truncate text-[11px] text-muted">
            {label.trim() || (phase === 'focus' ? 'Focus Session' : 'Break Time')}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-outline btn-xs h-7 px-1.5 text-muted"
            onClick={() => adjustMinutes(-5)}
            title="Subtract 5 minutes"
          >
            <Minus size={12} />
          </button>

          <button
            type="button"
            className={cn('btn-sm h-8 w-8 rounded-full p-0 flex items-center justify-center', running ? 'btn-outline border-accent text-accent' : 'btn-primary')}
            onClick={toggle}
            title={running ? 'Pause timer' : 'Resume timer'}
          >
            {running ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          <button
            type="button"
            className="btn-outline btn-xs h-7 px-1.5 text-muted"
            onClick={() => adjustMinutes(5)}
            title="Add 5 minutes"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
