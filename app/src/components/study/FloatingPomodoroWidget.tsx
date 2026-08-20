import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Crown,
  Edit2,
  ExternalLink,
  Flame,
  GripHorizontal,
  Leaf,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Sparkles,
  Sprout,
  Zap,
} from 'lucide-react';
import { usePomodoroStore, PHASE_LABEL, type PomodoroPhase } from '@/store/usePomodoroStore';
import { useUiStore } from '@/store/useUiStore';
import { useData } from '@/hooks/useMetrics';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { useDocumentPip } from '@/hooks/useDocumentPip';
import { PipTimerView } from './PipTimerView';
import { burstConfetti } from '@/utils/confetti';
import { cn } from '@/utils/misc';

const WIDGET_MILESTONES = [
  { threshold: 0, name: 'Seed', icon: Sprout, color: '#10b981' },
  { threshold: 0.25, name: 'Sprout', icon: Leaf, color: '#06b6d4' },
  { threshold: 0.5, name: 'Flow', icon: Zap, color: '#6366f1' },
  { threshold: 0.75, name: 'Fire', icon: Flame, color: '#f59e0b' },
  { threshold: 1.0, name: 'Crown', icon: Crown, color: '#eab308' },
];

export function FloatingPomodoroWidget() {
  const data = useData();
  const cfg = data.settings.pomodoro;
  const route = useUiStore((s) => s.route);
  const navigate = useUiStore((s) => s.navigate);
  const toast = useFeedbackStore((s) => s.toast);

  const { isPipSupported, isPipOpen, pipWindow, openPip, closePip } = useDocumentPip();

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const completedFocus = usePomodoroStore((s) => s.completedFocus);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const minimized = usePomodoroStore((s) => s.minimized);
  const alerting = usePomodoroStore((s) => s.alerting);

  const setLabel = usePomodoroStore((s) => s.setLabel);
  const toggle = usePomodoroStore((s) => s.toggle);
  const resetStore = usePomodoroStore((s) => s.reset);
  const skipStore = usePomodoroStore((s) => s.skip);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);
  const setMinimized = usePomodoroStore((s) => s.setMinimized);
  const submitEarly = usePomodoroStore((s) => s.submitEarly);
  const acknowledgeAlert = usePomodoroStore((s) => s.acknowledgeAlert);
  const tick = usePomodoroStore((s) => s.tick);

  const setPipActive = usePomodoroStore((s) => s.setPipActive);
  const pipRequested = usePomodoroStore((s) => s.pipRequested);
  const lastHandledPipRequestRef = useRef(pipRequested);

  const [isCompact, setIsCompact] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  // Sync isPipActive state to the global store
  useEffect(() => {
    setPipActive(isPipOpen);
  }, [isPipOpen, setPipActive]);

  // Handle external PiP toggle requests (e.g. from Study page PomodoroTimer)
  useEffect(() => {
    if (pipRequested > lastHandledPipRequestRef.current) {
      lastHandledPipRequestRef.current = pipRequested;
      handlePiPClick();
    }
  }, [pipRequested]);

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

  // Draggable logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const el = widgetRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: rect.left,
      posY: rect.top,
    };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !widgetRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const widgetRect = widgetRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - widgetRect.width - 12;
    const maxY = window.innerHeight - widgetRect.height - 12;

    const nextX = Math.max(12, Math.min(maxX, dragStartRef.current.posX + dx));
    const nextY = Math.max(12, Math.min(maxY, dragStartRef.current.posY + dy));

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePiPClick = async () => {
    if (isPipOpen) {
      closePip();
      return;
    }

    if (!isPipSupported) {
      toast({
        kind: 'info',
        title: 'Picture-in-Picture Unsupported',
        message: 'PiP window is supported in Chrome/Edge. You can drag this floating timer anywhere on your screen.',
      });
      return;
    }

    const win = await openPip({ width: 340, height: 260 });
    if (!win) {
      toast({
        kind: 'error',
        title: 'Could not open Picture-in-Picture',
        message: 'Please ensure popups are allowed for this site.',
      });
    }
  };

  const handleSaveEarly = () => {
    burstConfetti('small');
    submitEarly();
  };

  const cfgTotal =
    (phase === 'focus'
      ? cfg.focusMinutes
      : phase === 'break'
        ? cfg.breakMinutes
        : cfg.longBreakMinutes) * 60;

  const reset = () => {
    resetStore(cfgTotal);
  };

  const skip = () => {
    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus';
    const nextSec = (nextPhase === 'focus' ? cfg.focusMinutes : cfg.breakMinutes) * 60;
    skipStore(nextPhase, nextSec);
  };

  const isSessionActive = running || alerting || phase === 'break';
  const shouldDisplay = isSessionActive && route !== 'study';

  // Render PiP portal if window is open
  const pipPortal =
    isPipOpen && pipWindow
      ? createPortal(<PipTimerView onReturnToTab={closePip} />, pipWindow.document.body)
      : null;

  if (!shouldDisplay && !isPipOpen) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const subject = data.subjects.find((s) => s.id === subjectId);

  const total = Math.max(cfgTotal, remaining, 1);
  const progress = Math.min(1, Math.max(0, (total - remaining) / total));

  let currentMilestone = WIDGET_MILESTONES[0];
  for (let i = WIDGET_MILESTONES.length - 1; i >= 0; i--) {
    if (progress >= WIDGET_MILESTONES[i].threshold) {
      currentMilestone = WIDGET_MILESTONES[i];
      break;
    }
  }
  const ActiveIcon = currentMilestone.icon;

  // Round indicator dots
  const roundCycle = cfg.roundsBeforeLongBreak || 4;
  const currentInCycle = completedFocus % roundCycle;

  const stylePosition = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
      }
    : undefined;

  return (
    <>
      {pipPortal}

      {shouldDisplay && (
        <div
          ref={widgetRef}
          style={stylePosition}
          className={cn(
            'fixed z-40 select-none transition-shadow',
            !position && 'bottom-20 right-4 md:bottom-6 md:right-6',
            minimized ? 'w-auto' : isCompact ? 'w-auto max-w-sm' : 'w-80',
          )}
        >
          {minimized ? (
            /* MINIMIZED BUBBLE */
            <div className="animate-fade-in">
              <button
                type="button"
                onClick={() => setMinimized(false)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-pop backdrop-blur-md transition-all hover:scale-105',
                  alerting
                    ? 'bg-surface/95 text-warn border-warn/60 ring-2 ring-warn/40 animate-pulse'
                    : phase === 'focus'
                      ? 'bg-surface/95 text-accent border-accent/40 shadow-accent/10'
                      : 'bg-surface/95 text-ok border-ok/40 shadow-ok/10',
                )}
                title="Expand Focus Timer Widget"
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
          ) : isCompact ? (
            /* COMPACT SLIM PILL MODE */
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border bg-surface/95 px-3 py-1.5 shadow-pop backdrop-blur-md animate-fade-in transition-all',
                alerting
                  ? 'border-warn/60 ring-2 ring-warn/30'
                  : running
                    ? 'border-accent/40 shadow-accent/15'
                    : 'border-line',
              )}
            >
              {/* Draggable handle */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="cursor-grab active:cursor-grabbing flex items-center gap-1.5"
                title="Drag widget"
              >
                <GripHorizontal size={13} className="text-muted/60" />
                <ActiveIcon size={13} style={{ color: currentMilestone.color }} className={cn(running && 'animate-pulse')} />
                <span
                  className={cn(
                    'text-base font-extrabold tabular leading-none font-mono tracking-tight',
                    alerting ? 'text-warn animate-timer-alert' : 'text-ink',
                  )}
                >
                  {alerting ? 'Done!' : `${mm}:${ss}`}
                </span>
              </div>

              {/* Truncated Task Name */}
              <span className="max-w-[80px] truncate text-[11px] text-muted">
                {label.trim() || (phase === 'focus' ? 'Focus' : 'Break')}
              </span>

              {/* Play/Pause Button */}
              <button
                type="button"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-90',
                  running
                    ? 'border border-accent text-accent'
                    : 'bg-accent text-white shadow-sm',
                )}
                onClick={toggle}
                title={running ? 'Pause timer' : 'Start timer'}
              >
                {running ? <Pause size={10} /> : <Play size={10} className="ml-0.5" />}
              </button>

              {/* +5m button */}
              <button
                type="button"
                className="btn-ghost btn-xs h-6 px-1 text-muted hover:text-ink text-[10px]"
                onClick={() => adjustMinutes(5)}
                title="Add 5 minutes"
              >
                +5m
              </button>

              {/* Expand to Full Card */}
              <button
                type="button"
                className="btn-icon h-6 w-6 text-muted hover:text-ink"
                onClick={() => setIsCompact(false)}
                title="Expand to Full Card"
              >
                <ChevronsUpDown size={12} />
              </button>

              {/* PiP Button */}
              <button
                type="button"
                className={cn(
                  'btn-icon h-6 w-6 transition-colors',
                  isPipOpen ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink',
                )}
                onClick={handlePiPClick}
                title="Picture-in-Picture"
              >
                <PictureInPicture2 size={12} />
              </button>

              {/* Minimize to chip */}
              <button
                type="button"
                className="btn-icon h-6 w-6 text-muted hover:text-ink"
                onClick={() => setMinimized(true)}
                title="Minimize"
              >
                <Minimize2 size={12} />
              </button>
            </div>
          ) : (
            /* FULL CARD MODE */
            <div
              className={cn(
                'rounded-2xl border bg-surface/95 p-3.5 shadow-pop backdrop-blur-md animate-slide-up transition-all',
                alerting
                  ? 'border-warn/60 ring-2 ring-warn/30'
                  : running
                    ? phase === 'focus'
                      ? 'border-accent/40 shadow-accent/15'
                      : 'border-ok/40 shadow-ok/15'
                    : 'border-line',
              )}
            >
              {/* Draggable Header */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={cn(
                  'flex items-center justify-between border-b border-line pb-2 cursor-grab active:cursor-grabbing',
                  isDragging && 'cursor-grabbing',
                )}
                title="Drag to move widget"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <GripHorizontal size={14} className="text-muted/60 shrink-0" />
                  {/* Glowing Pulse Dot */}
                  <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
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
                        'relative inline-flex h-1.5 w-1.5 rounded-full',
                        alerting ? 'bg-warn' : phase === 'focus' ? 'bg-accent' : 'bg-ok',
                      )}
                    />
                  </span>

                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      alerting ? 'text-warn' : phase === 'focus' ? 'text-accent' : 'text-ok',
                    )}
                  >
                    {alerting ? 'Time is up!' : PHASE_LABEL[phase]}
                  </span>

                  {subject && (
                    <span
                      className="truncate max-w-[85px] text-[10px] rounded px-1.5 py-0.5 border"
                      style={{
                        borderColor: `${subject.color}40`,
                        background: `${subject.color}15`,
                        color: subject.color,
                      }}
                    >
                      {subject.code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Round cycle dots */}
                  <div
                    className="flex items-center gap-0.5 mr-1"
                    title={`${completedFocus} rounds done today`}
                  >
                    {Array.from({ length: roundCycle }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full transition-all',
                          i < currentInCycle
                            ? 'bg-accent shadow-[0_0_4px_rgba(99,102,241,0.7)]'
                            : 'bg-muted/30',
                        )}
                      />
                    ))}
                  </div>

                  {/* Compact Mode Switcher */}
                  <button
                    type="button"
                    className="btn-icon h-6 w-6 text-muted hover:text-ink"
                    onClick={() => setIsCompact(true)}
                    title="Switch to Compact Bar"
                  >
                    <ChevronsDownUp size={13} />
                  </button>

                  {/* Picture-in-Picture Button */}
                  <button
                    type="button"
                    className={cn(
                      'btn-icon h-6 w-6 transition-colors',
                      isPipOpen
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:text-ink',
                    )}
                    onClick={handlePiPClick}
                    title={
                      isPipOpen
                        ? 'Close Picture-in-Picture'
                        : 'Open in Picture-in-Picture (Always on top)'
                    }
                  >
                    <PictureInPicture2 size={13} />
                  </button>

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

              {/* Status banner when PiP is active */}
              {isPipOpen && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-accent-soft/70 px-2.5 py-1 text-[11px] text-accent animate-fade-in">
                  <span className="flex items-center gap-1 font-medium">
                    <Sparkles size={11} /> Playing in PiP Window
                  </span>
                  <button
                    type="button"
                    onClick={closePip}
                    className="font-semibold underline hover:opacity-80"
                  >
                    Dock here
                  </button>
                </div>
              )}

              {/* Countdown & Session Name */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-3xl font-extrabold tabular leading-none tracking-tight font-mono',
                      alerting ? 'text-warn animate-timer-alert' : 'text-ink',
                    )}
                  >
                    {alerting ? 'Done!' : `${mm}:${ss}`}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {isEditingLabel ? (
                      <input
                        type="text"
                        autoFocus
                        className="input input-sm h-6 text-xs py-0 px-1"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={() => setIsEditingLabel(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingLabel(false)}
                        placeholder="Task name..."
                      />
                    ) : (
                      <p
                        onClick={() => setIsEditingLabel(true)}
                        className="group flex items-center gap-1 truncate text-[11px] text-muted hover:text-ink cursor-pointer"
                        title="Click to edit task name"
                      >
                        <span className="truncate">
                          {label.trim() || (phase === 'focus' ? 'Click to set task' : 'Break Time')}
                        </span>
                        <Edit2 size={10} className="opacity-0 group-hover:opacity-100 shrink-0" />
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
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
                          'btn-sm h-8 w-8 rounded-full p-0 flex items-center justify-center transition-all',
                          running
                            ? 'btn-outline border-accent text-accent'
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 hover:scale-105',
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
                    </>
                  )}
                </div>
              </div>

              {/* Milestone Checkpoint Evolution Track */}
              {phase === 'focus' && !alerting && (
                <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-line/40 pt-2 px-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <ActiveIcon size={12} style={{ color: currentMilestone.color }} className="animate-pulse" />
                    <span className="font-bold" style={{ color: currentMilestone.color }}>
                      {currentMilestone.name} ({Math.round(progress * 100)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {WIDGET_MILESTONES.map((m, idx) => {
                      const Icon = m.icon;
                      const isUnlocked = progress >= m.threshold;
                      return (
                        <div key={m.name} className="flex items-center gap-0.5" title={m.name}>
                          <div
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded-full transition-all',
                              isUnlocked ? 'shadow-sm' : 'opacity-25 bg-surface border border-line',
                            )}
                            style={
                              isUnlocked
                                ? {
                                    backgroundColor: `${m.color}25`,
                                    color: m.color,
                                  }
                                : undefined
                            }
                          >
                            <Icon size={9} />
                          </div>
                          {idx < WIDGET_MILESTONES.length - 1 && (
                            <div
                              className={cn(
                                'h-0.5 w-1.5 rounded',
                                progress >= WIDGET_MILESTONES[idx + 1].threshold
                                  ? 'bg-accent'
                                  : 'bg-line',
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extra Controls Row: Reset, Skip, Save */}
              {!alerting && (
                <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn-ghost btn-xs h-6 px-1.5 text-muted hover:text-ink gap-1"
                      onClick={reset}
                      title="Reset timer"
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-xs h-6 px-1.5 text-muted hover:text-ink gap-1"
                      onClick={skip}
                      title="Skip phase"
                    >
                      <SkipForward size={11} /> Skip
                    </button>
                  </div>

                  {phase === 'focus' && (running || !!usePomodoroStore.getState().startedAt) && (
                    <button
                      type="button"
                      className="btn-outline btn-xs h-6 gap-1 text-ok border-ok/60 hover:bg-ok/10"
                      onClick={handleSaveEarly}
                      title="Log elapsed study time and stop"
                    >
                      <Save size={11} /> Save &amp; Stop
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
