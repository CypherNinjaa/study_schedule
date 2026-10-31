import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit3,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  SkipForward,
} from 'lucide-react';
import type { StudyMethod } from '@/types';
import { updateSettings } from '@/store/actions';
import { usePomodoroStore, PHASE_LABEL, type PomodoroPhase } from '@/store/usePomodoroStore';
import { useData } from '@/hooks/useMetrics';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { SnakeCircularTimer } from './SnakeCircularTimer';
import { cn } from '@/utils/misc';

const FOCUS_PRESETS = [15, 25, 45, 50, 60];
const BREAK_PRESETS = [3, 5, 10, 15];
const LONG_BREAK_PRESETS = [10, 15, 20, 30];

export function PomodoroTimer() {
  const data = useData();
  const cfg = data.settings.pomodoro;

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const displayTotal = usePomodoroStore((s) => s.displayTotal);
  const completedFocus = usePomodoroStore((s) => s.completedFocus);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const method = usePomodoroStore((s) => s.method);
  const alerting = usePomodoroStore((s) => s.alerting);
  const isPipActive = usePomodoroStore((s) => s.isPipActive);
  const requestPipToggle = usePomodoroStore((s) => s.requestPipToggle);

  const setLabel = usePomodoroStore((s) => s.setLabel);
  const setSubjectId = usePomodoroStore((s) => s.setSubjectId);
  const setMethod = usePomodoroStore((s) => s.setMethod);
  const setRemaining = usePomodoroStore((s) => s.setRemaining);
  const acknowledgeAlert = usePomodoroStore((s) => s.acknowledgeAlert);

  const toggle = usePomodoroStore((s) => s.toggle);
  const resetStore = usePomodoroStore((s) => s.reset);
  const skipStore = usePomodoroStore((s) => s.skip);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);
  const submitEarly = usePomodoroStore((s) => s.submitEarly);

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsControlsVisible, setFsControlsVisible] = useState(true);
  const fsHideTimerRef = useRef<number | null>(null);
  const isHoveringFsControlsRef = useRef(false);
  const didInitSubjectRef = useRef(false);

  const selectedSubject = useMemo(
    () => data.subjects.find((s) => s.id === subjectId) ?? null,
    [data.subjects, subjectId],
  );

  const cfgTotal =
    (phase === 'focus'
      ? cfg.focusMinutes
      : phase === 'break'
        ? cfg.breakMinutes
        : cfg.longBreakMinutes) * 60;
  const total = Math.max(displayTotal, cfgTotal, remaining, 1);
  const progress = Math.min(1, Math.max(0, (total - remaining) / total));
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const timeText = `${mm}:${ss}`;

  const prevPhaseRef = useRef(phase);
  const prevTotalRef = useRef(total);

  // Sync remaining time when phase or default settings change while idle
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      prevTotalRef.current = total;
      setRemaining(total, total);
      return;
    }
    if (prevTotalRef.current !== total) {
      if (!running && remaining === prevTotalRef.current) {
        setRemaining(total, total);
      }
      prevTotalRef.current = total;
    }
  }, [phase, total, running, remaining, setRemaining]);

  // Auto-select the first active subject if none is selected
  useEffect(() => {
    if (didInitSubjectRef.current) return;
    didInitSubjectRef.current = true;
    if (!subjectId) {
      const firstActive = data.subjects.find((s) => !s.archived);
      if (firstActive) {
        setSubjectId(firstActive.id);
      }
    }
  }, [subjectId, data.subjects, setSubjectId]);

  const triggerFsActivity = useCallback(() => {
    setFsControlsVisible(true);
    if (fsHideTimerRef.current !== null) {
      window.clearTimeout(fsHideTimerRef.current);
    }
    fsHideTimerRef.current = window.setTimeout(() => {
      if (!isHoveringFsControlsRef.current) {
        setFsControlsVisible(false);
      }
    }, 2400);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      triggerFsActivity();
    } else if (fsHideTimerRef.current !== null) {
      window.clearTimeout(fsHideTimerRef.current);
    }
    return () => {
      if (fsHideTimerRef.current !== null) {
        window.clearTimeout(fsHideTimerRef.current);
      }
    };
  }, [isFullscreen, triggerFsActivity]);

  const toggleFullscreen = useCallback(async () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    try {
      if (next && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (!next && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback to overlay
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  const reset = () => {
    resetStore(cfgTotal);
  };

  const skip = () => {
    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus';
    const nextSec = (nextPhase === 'focus' ? cfg.focusMinutes : cfg.breakMinutes) * 60;
    skipStore(nextPhase, nextSec);
  };

  const updatePomodoroSetting = (patch: Partial<typeof cfg>) => {
    updateSettings({ pomodoro: { ...cfg, ...patch } });
    if (!running) {
      const nextFocus = patch.focusMinutes ?? cfg.focusMinutes;
      const nextBreak = patch.breakMinutes ?? cfg.breakMinutes;
      const nextLong = patch.longBreakMinutes ?? cfg.longBreakMinutes;
      const nextSec =
        (phase === 'focus' ? nextFocus : phase === 'break' ? nextBreak : nextLong) * 60;
      setRemaining(nextSec, nextSec);
    }
  };

  const shouldShowFsControls = fsControlsVisible || alerting;

  /* ==========================================================================
     IMMERSIVE ZEN FULLSCREEN FOCUS
     ========================================================================== */
  const fullscreenOverlay =
    isFullscreen && typeof document !== 'undefined'
      ? createPortal(
          <div
            onMouseMove={triggerFsActivity}
            onPointerMove={triggerFsActivity}
            onClick={triggerFsActivity}
            className={cn(
              'fixed inset-0 z-50 flex flex-col justify-between bg-[#111215] text-[#eceae5] select-none',
              !shouldShowFsControls && 'cursor-none',
            )}
          >
            {/* Top Bar with Exit */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-between px-8 py-6 transition-all duration-300',
                shouldShowFsControls
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-3 pointer-events-none',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="font-mono text-xs tracking-wider text-muted">
                  ZEN FOCUS MODE
                </span>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex h-8 items-center gap-1.5 rounded-ctl border border-line bg-surface/80 px-3 text-xs text-muted hover:text-ink hover:bg-elevated transition-colors"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 size={13} /> Exit
              </button>
            </div>

            {/* Centered Snake Circular Progress Timer */}
            <div className="flex flex-1 items-center justify-center">
              <SnakeCircularTimer
                progress={progress}
                timeText={timeText}
                phaseLabel={PHASE_LABEL[phase]}
                running={running}
                alerting={alerting}
                size={340}
                strokeWidth={11}
                subjectColor={selectedSubject?.color}
                subjectCode={selectedSubject?.code}
                sessionNote={label}
              />
            </div>

            {/* Floating Dock */}
            <div
              onMouseEnter={() => {
                isHoveringFsControlsRef.current = true;
                setFsControlsVisible(true);
              }}
              onMouseLeave={() => {
                isHoveringFsControlsRef.current = false;
                triggerFsActivity();
              }}
              className={cn(
                'relative z-10 mx-auto mb-8 flex flex-col items-center gap-3 px-4 transition-all duration-300',
                shouldShowFsControls
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3 pointer-events-none',
              )}
            >
              {alerting && (
                <button
                  type="button"
                  className="btn-primary btn-sm px-4"
                  onClick={acknowledgeAlert}
                >
                  Session finished — Acknowledge
                </button>
              )}

              <div className="flex items-center gap-2 rounded-card border border-line bg-surface/90 px-4 py-2 backdrop-blur-md shadow-card">
                <button
                  type="button"
                  className="btn-outline btn-xs gap-1"
                  onClick={() => adjustMinutes(-5)}
                >
                  <Minus size={12} /> 5m
                </button>

                <button
                  type="button"
                  onClick={toggle}
                  className="btn-primary btn-sm px-4 gap-1.5"
                >
                  {running ? <Pause size={14} /> : <Play size={14} />}
                  {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
                </button>

                <button
                  type="button"
                  className="btn-outline btn-xs gap-1"
                  onClick={() => adjustMinutes(5)}
                >
                  <Plus size={12} /> 5m
                </button>

                {(running || !!usePomodoroStore.getState().startedAt) && phase === 'focus' && (
                  <button
                    type="button"
                    onClick={submitEarly}
                    className="btn-outline btn-xs gap-1 text-ok"
                  >
                    <Save size={12} /> Save
                  </button>
                )}

                <button
                  type="button"
                  onClick={reset}
                  disabled={remaining === cfgTotal && !running && !alerting}
                  className="btn-ghost btn-xs gap-1 text-muted"
                >
                  <RotateCcw size={12} /> Reset
                </button>

                <button
                  type="button"
                  onClick={skip}
                  className="btn-ghost btn-xs gap-1 text-muted"
                >
                  <SkipForward size={12} /> Skip
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {fullscreenOverlay}

      <Card>
        <CardHeader
          title="Focus timer"
          subtitle={`${cfg.focusMinutes}m focus · ${cfg.breakMinutes}m break · round ${completedFocus + 1}`}
          action={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  'btn-ghost btn-xs gap-1',
                  isPipActive && 'bg-accent-soft text-accent',
                )}
                onClick={requestPipToggle}
                title={isPipActive ? 'Close Picture-in-Picture' : 'Open Picture-in-Picture'}
              >
                <PictureInPicture2 size={13} />
                <span className="hidden sm:inline">PiP</span>
              </button>
              <button
                type="button"
                className={cn(
                  'btn-ghost btn-xs gap-1',
                  isEditingSettings && 'bg-accent-soft text-accent',
                )}
                onClick={() => setIsEditingSettings(!isEditingSettings)}
                title="Edit timer presets"
              >
                <Edit3 size={13} />
                <span className="hidden sm:inline">Presets</span>
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn-outline btn-xs gap-1"
                title="Immersive Fullscreen"
              >
                <Maximize2 size={12} />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          }
        />

        <div className="flex flex-col items-center gap-4 p-5">
          {/* Preset Settings Drawer */}
          {isEditingSettings && (
            <div className="w-full rounded-ctl border border-line bg-surface p-3 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-line pb-2 font-medium text-ink">
                <span className="flex items-center gap-1.5">
                  <SettingsIcon size={14} className="text-accent" /> Duration settings
                </span>
                <button
                  type="button"
                  className="text-muted hover:text-ink text-[11px]"
                  onClick={() => setIsEditingSettings(false)}
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block label">Focus (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className="input input-sm tabular"
                    value={cfg.focusMinutes}
                    onChange={(e) =>
                      updatePomodoroSetting({
                        focusMinutes: Math.max(1, Number(e.target.value) || 25),
                      })
                    }
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {FOCUS_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                          cfg.focusMinutes === m
                            ? 'border-accent bg-accent-soft text-accent font-semibold'
                            : 'border-line text-muted hover:bg-elevated',
                        )}
                        onClick={() => updatePomodoroSetting({ focusMinutes: m })}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block label">Short break (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className="input input-sm tabular"
                    value={cfg.breakMinutes}
                    onChange={(e) =>
                      updatePomodoroSetting({
                        breakMinutes: Math.max(1, Number(e.target.value) || 5),
                      })
                    }
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {BREAK_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                          cfg.breakMinutes === m
                            ? 'border-accent bg-accent-soft text-accent font-semibold'
                            : 'border-line text-muted hover:bg-elevated',
                        )}
                        onClick={() => updatePomodoroSetting({ breakMinutes: m })}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block label">Long break (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    className="input input-sm tabular"
                    value={cfg.longBreakMinutes}
                    onChange={(e) =>
                      updatePomodoroSetting({
                        longBreakMinutes: Math.max(1, Number(e.target.value) || 15),
                      })
                    }
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {LONG_BREAK_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                          cfg.longBreakMinutes === m
                            ? 'border-accent bg-accent-soft text-accent font-semibold'
                            : 'border-line text-muted hover:bg-elevated',
                        )}
                        onClick={() => updatePomodoroSetting({ longBreakMinutes: m })}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Snake Circular Progress Timer */}
          <div className="my-2 flex justify-center">
            <SnakeCircularTimer
              progress={progress}
              timeText={timeText}
              phaseLabel={PHASE_LABEL[phase]}
              running={running}
              alerting={alerting}
              size={240}
              strokeWidth={9}
              subjectColor={selectedSubject?.color}
              subjectCode={selectedSubject?.code}
              sessionNote={label}
            />
          </div>

          {alerting && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={acknowledgeAlert}
            >
              Session completed — Acknowledge
            </button>
          )}

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn-outline btn-xs gap-1 text-muted"
              onClick={() => adjustMinutes(-5)}
              title="Subtract 5 minutes"
            >
              <Minus size={13} /> 5m
            </button>

            <button type="button" className="btn-primary gap-1.5 px-4" onClick={toggle}>
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
            </button>

            <button
              type="button"
              className="btn-outline btn-xs gap-1 text-muted"
              onClick={() => adjustMinutes(5)}
              title="Add 5 minutes"
            >
              <Plus size={13} /> 5m
            </button>

            {(running || !!usePomodoroStore.getState().startedAt) && phase === 'focus' && (
              <button
                type="button"
                className="btn-outline btn-sm gap-1.5 text-ok border-ok/40 hover:bg-ok/10"
                onClick={submitEarly}
                title="Log elapsed study time and stop the timer"
              >
                <Save size={14} /> Save &amp; Stop
              </button>
            )}

            <button
              type="button"
              className="btn-outline btn-sm gap-1.5"
              onClick={reset}
              disabled={remaining === cfgTotal && !running && !alerting}
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm gap-1.5"
              onClick={skip}
              title="Skip to next phase without recording"
            >
              <SkipForward size={14} /> Skip
            </button>
          </div>

          {/* Session Context Input */}
          <div className="grid w-full gap-3 sm:grid-cols-3 pt-1 border-t border-line">
            <label className="block sm:col-span-3">
              <span className="label">Focus goal</span>
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="What are you focusing on?"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Subject</span>
              <select
                className="input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">No subject</option>
                {data.subjects
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Method</span>
              <select
                className="input"
                value={method}
                onChange={(e) => setMethod(e.target.value as StudyMethod)}
              >
                {(
                  [
                    'reading',
                    'practice',
                    'revision',
                    'problem_solving',
                    'coding',
                    'flashcards',
                  ] as StudyMethod[]
                ).map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>
    </>
  );
}
