import { useEffect } from 'react';
import {
  Coffee,
  ExternalLink,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  Save,
} from 'lucide-react';
import { usePomodoroStore, PHASE_LABEL } from '@/store/usePomodoroStore';
import { useUiStore } from '@/store/useUiStore';
import { useData } from '@/hooks/useMetrics';
import { cn } from '@/utils/misc';

export function FloatingPomodoroWidget() {
  const data = useData();
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const minimized = usePomodoroStore((s) => s.minimized);
  const alerting = usePomodoroStore((s) => s.alerting);

  const toggle = usePomodoroStore((s) => s.toggle);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);
  const setMinimized = usePomodoroStore((s) => s.setMinimized);
  const submitEarly = usePomodoroStore((s) => s.submitEarly);
  const acknowledgeAlert = usePomodoroStore((s) => s.acknowledgeAlert);
  const tick = usePomodoroStore((s) => s.tick);

  // Global tick interval engine — owned here so it persists across route changes.
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      tick();
    }, 250);
    return () => window.clearInterval(interval);
  }, [running, tick]);

  // Update Document Title with active countdown.
  useEffect(() => {
    if (!running) {
      // Title blink is managed by the store; reset only when not alerting.
      if (!alerting) document.title = 'Study Schedule';
      return;
    }
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    document.title = `(${mm}:${ss}) ${PHASE_LABEL[phase]} - Study Schedule`;
    return () => {
      if (!alerting) document.title = 'Study Schedule';
    };
  }, [running, remaining, phase, alerting]);

  // The widget stays visible whenever:
  //   - the timer is running (focus or break)
  //   - we are in alert state (just finished)
  //   - we are in break phase (user should know break is active)
  // It hides only when we are on the Study page itself (full timer is visible there).
  const isSessionActive = running || alerting || phase === 'break';
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
            'flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-pop backdrop-blur-md transition-all hover:scale-105',
            alerting
              ? 'bg-surface/95 text-warn border-warn/60 ring-2 ring-warn/40 animate-pulse'
              : phase === 'focus'
                ? 'bg-surface/95 text-accent border-accent/40'
                : 'bg-surface/95 text-ok border-ok/40',
          )}
          title="Expand Pomodoro Timer Widget"
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            {running && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  alerting ? 'bg-warn' : phase === 'focus' ? 'bg-accent' : 'bg-ok',
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                alerting ? 'bg-warn' : phase === 'focus' ? 'bg-accent' : 'bg-ok',
              )}
            />
          </span>
          <span className="text-xs font-semibold tabular text-ink">
            {alerting ? 'Done!' : `${mm}:${ss}`}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {alerting ? 'Time up' : PHASE_LABEL[phase]}
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
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider',
              alerting ? 'text-warn' : phase === 'focus' ? 'text-accent' : 'text-ok',
            )}
          >
            {alerting ? 'Time is up!' : PHASE_LABEL[phase]}
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
          <p
            className={cn(
              'text-2xl font-bold tabular leading-none',
              alerting ? 'text-warn animate-timer-alert' : 'text-ink',
            )}
          >
            {alerting ? 'Done!' : `${mm}:${ss}`}
          </p>
          <p className="mt-1 max-w-[140px] truncate text-[11px] text-muted">
            {label.trim() || (phase === 'focus' ? 'Focus Session' : 'Break Time')}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          {alerting ? (
            <button
              type="button"
              className="btn-sm btn-primary gap-1"
              onClick={acknowledgeAlert}
            >
              Got it
            </button>
          ) : (
            <>
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
                className={cn(
                  'btn-sm h-8 w-8 rounded-full p-0 flex items-center justify-center',
                  running ? 'btn-outline border-accent text-accent' : 'btn-primary',
                )}
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

              {phase === 'focus' && (running || !!usePomodoroStore.getState().startedAt) && (
                <button
                  type="button"
                  className="btn-outline btn-xs gap-1 text-ok border-ok/60"
                  onClick={submitEarly}
                  title="Log elapsed study time and stop"
                >
                  <Save size={11} /> Save
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
