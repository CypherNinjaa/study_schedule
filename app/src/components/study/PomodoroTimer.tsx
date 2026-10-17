import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Atom,
  Coffee,
  Edit3,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Shuffle,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StudyMethod } from '@/types';
import { updateSettings } from '@/store/actions';
import { usePomodoroStore, PHASE_LABEL, type PomodoroPhase } from '@/store/usePomodoroStore';
import { useData } from '@/hooks/useMetrics';
import { levelFromXP } from '@/services/xp';
import { Card, CardHeader, Ring } from '@/components/ui/Primitives';
import { playCrystallizeChime, playSupernovaBurst } from '@/utils/ambientAudio';
import { cn } from '@/utils/misc';
import {
  isWebGLAvailable,
  QUANTUM_THEMES,
  type QuantumTheme,
  type QuantumThemeId,
} from './quantumThemes';

const LazyAtomPomodoroScene = lazy(() => import('./AtomPomodoroScene'));

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
  const [isPickingTheme, setIsPickingTheme] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [crystalSoundEnabled, setCrystalSoundEnabled] = useState(true);

  // Check WebGL + prefers-reduced-motion for automatic fallback to 2D ring
  const [prefer2DFallback, setPrefer2DFallback] = useState(() => {
    if (typeof window === 'undefined') return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reducedMotion || !isWebGLAvailable();
  });

  // User Level & Study Streak for unlocking themes and scaling atomic mass (particle count)
  const userLevel = useMemo(() => levelFromXP(data.xp.total).level, [data.xp.total]);
  const streakDays = data.streaks.streaks.study.current;

  const unlockedThemes = useMemo(
    () => QUANTUM_THEMES.filter((t) => t.unlockLevel <= userLevel),
    [userLevel],
  );

  const [selectedThemeId, setSelectedThemeId] = useState<QuantumThemeId>(() => {
    const pool = QUANTUM_THEMES.filter((t) => t.unlockLevel <= userLevel);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? QUANTUM_THEMES[0];
    return pick.id;
  });

  const currentTheme: QuantumTheme = useMemo(
    () => QUANTUM_THEMES.find((t) => t.id === selectedThemeId) ?? QUANTUM_THEMES[0],
    [selectedThemeId],
  );

  const pickRandomUnlockedTheme = useCallback(() => {
    const pool = unlockedThemes.length > 0 ? unlockedThemes : [QUANTUM_THEMES[0]];
    if (pool.length === 1) {
      setSelectedThemeId(pool[0].id);
      return;
    }
    const candidates = pool.filter((t) => t.id !== selectedThemeId);
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
    setSelectedThemeId(next.id);
  }, [unlockedThemes, selectedThemeId]);

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

  const prevPhaseRef = useRef(phase);
  const prevTotalRef = useRef(total);
  const prevRunningRef = useRef(running);
  const lastCrystalSecondRef = useRef<number>(remaining);
  const prevAlertingRef = useRef(alerting);

  // Sync remaining time when phase or default settings change while idle.
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      prevTotalRef.current = total;
      setRemaining(total, total);
      pickRandomUnlockedTheme();
      return;
    }
    if (prevTotalRef.current !== total) {
      if (!running && remaining === prevTotalRef.current) {
        setRemaining(total, total);
      }
      prevTotalRef.current = total;
    }
  }, [phase, total, running, remaining, setRemaining, pickRandomUnlockedTheme]);

  // Pick a random unlocked theme when a new session starts from full duration
  useEffect(() => {
    if (!prevRunningRef.current && running && remaining === total) {
      pickRandomUnlockedTheme();
    }
    prevRunningRef.current = running;
  }, [running, remaining, total, pickRandomUnlockedTheme]);

  // Subtle "crystallize" chime on each minute change while running
  useEffect(() => {
    if (running && crystalSoundEnabled && cfg.soundEnabled) {
      if (
        remaining !== lastCrystalSecondRef.current &&
        remaining > 0 &&
        remaining < total &&
        remaining % 60 === 0
      ) {
        playCrystallizeChime();
      }
    }
    lastCrystalSecondRef.current = remaining;
  }, [remaining, running, total, crystalSoundEnabled, cfg.soundEnabled]);

  // Subtle supernova burst sound when round completes
  useEffect(() => {
    if (!prevAlertingRef.current && alerting && crystalSoundEnabled && cfg.soundEnabled) {
      playSupernovaBurst();
    }
    prevAlertingRef.current = alerting;
  }, [alerting, crystalSoundEnabled, cfg.soundEnabled]);

  const [fsControlsVisible, setFsControlsVisible] = useState(true);
  const fsHideTimerRef = useRef<number | null>(null);
  const isHoveringFsControlsRef = useRef(false);
  const didInitSubjectRef = useRef(false);

  // Auto-select the first active subject once if none is selected so sessions link to a subject by default
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
    }, 2200);
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

  // Fullscreen toggle + Escape key listener
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
      // Fallback to CSS fixed fullscreen overlay if browser blocks requestFullscreen
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

  const ringTone =
    alerting
      ? 'var(--c-warn)'
      : phase === 'focus'
        ? selectedSubject?.color ?? 'var(--accent)'
        : 'var(--c-ok)';

  const fallback2DRing = (
    <div className={cn('my-4 rounded-full transition-transform', alerting && 'animate-timer-alert')}>
      <Ring value={progress} size={184} stroke={10} tone={ringTone}>
        <span className={cn('text-3xl font-semibold tabular', alerting ? 'text-warn' : 'text-ink')}>
          {mm}:{ss}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          {phase !== 'focus' && <Coffee size={12} />}
          {alerting ? 'Time is up!' : PHASE_LABEL[phase]}
        </span>
      </Ring>
    </div>
  );

  const shouldShowFsControls = fsControlsVisible || alerting;

  /* ==========================================================================
     IMMERSIVE FULLSCREEN QUANTUM FOCUS PORTAL (Auto-hides controls on idle)
     ========================================================================== */
  const fullscreenOverlay =
    isFullscreen && typeof document !== 'undefined'
      ? createPortal(
          <div
            onMouseMove={triggerFsActivity}
            onPointerMove={triggerFsActivity}
            onClick={triggerFsActivity}
            className={cn(
              'fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-slate-100 animate-fade-in overflow-hidden select-none',
              !shouldShowFsControls && 'cursor-none',
            )}
          >
            {/* Full-viewport 3D Quantum Atom Canvas */}
            <div className="absolute inset-0 z-0">
              {!prefer2DFallback ? (
                <Suspense fallback={<div className="h-full w-full bg-slate-950" />}>
                  <LazyAtomPomodoroScene
                    timeText={alerting ? 'DONE!' : `${mm}:${ss}`}
                    phaseLabel={PHASE_LABEL[phase]}
                    progress={progress}
                    running={running}
                    alerting={alerting}
                    phase={phase}
                    theme={currentTheme}
                    subjectColor={selectedSubject?.color ?? null}
                    subjectCode={selectedSubject?.code ?? null}
                    streakDays={streakDays}
                    userLevel={userLevel}
                    isFullscreen={true}
                  />
                </Suspense>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-950">
                  {fallback2DRing}
                </div>
              )}
            </div>

            {/* Auto-hiding Exit Fullscreen Button (Top-Right Only) */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-end px-6 py-5 transition-all duration-500',
                shouldShowFsControls
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-3 pointer-events-none',
              )}
            >
              <button
                type="button"
                onMouseEnter={() => {
                  isHoveringFsControlsRef.current = true;
                  setFsControlsVisible(true);
                }}
                onMouseLeave={() => {
                  isHoveringFsControlsRef.current = false;
                  triggerFsActivity();
                }}
                onClick={toggleFullscreen}
                className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-slate-900/80 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 backdrop-blur-md shadow-lg transition-colors"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 size={13} /> Exit Fullscreen
              </button>
            </div>

            {/* Auto-hiding Bottom Floating Control Dock */}
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
                'relative z-10 mx-auto mb-7 flex flex-col items-center gap-3 px-4 transition-all duration-500',
                shouldShowFsControls
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none',
              )}
            >
              {alerting && (
                <button
                  type="button"
                  className="btn-primary btn-sm animate-bounce shadow-lg"
                  onClick={acknowledgeAlert}
                >
                  Got it
                </button>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-2.5 shadow-2xl backdrop-blur-xl">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
                  onClick={() => adjustMinutes(-5)}
                >
                  <Minus size={13} /> 5m
                </button>

                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-slate-950 shadow-lg transition-transform active:scale-95"
                  style={{
                    backgroundColor: selectedSubject?.color || currentTheme.coreColor,
                    boxShadow: `0 0 20px ${selectedSubject?.color || currentTheme.coreColor}60`,
                  }}
                >
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {running ? 'Pause Atom' : remaining < total ? 'Resume Atom' : 'Start Focus'}
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1"
                  onClick={() => adjustMinutes(5)}
                >
                  <Plus size={13} /> 5m
                </button>

                {(running || !!usePomodoroStore.getState().startedAt) && phase === 'focus' && (
                  <button
                    type="button"
                    onClick={submitEarly}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors flex items-center gap-1.5"
                  >
                    <Save size={13} /> Save &amp; Stop
                  </button>
                )}

                <button
                  type="button"
                  onClick={reset}
                  disabled={remaining === cfgTotal && !running && !alerting}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Reset
                </button>

                <button
                  type="button"
                  onClick={skip}
                  className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-1"
                >
                  <SkipForward size={13} /> Skip
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
        {/* Clean, Uncrushed CardHeader */}
        <CardHeader
          title="Quantum Focus"
          subtitle={`${cfg.focusMinutes}/${cfg.breakMinutes}m · long break every ${cfg.roundsBeforeLongBreak} rounds`}
          action={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  'btn-ghost btn-xs gap-1',
                  isPipActive && 'bg-accent-soft text-accent',
                )}
                onClick={requestPipToggle}
                title={
                  isPipActive
                    ? 'Close 2D Picture-in-Picture window'
                    : 'Open 2D timer in Picture-in-Picture (Always on top)'
                }
              >
                <PictureInPicture2 size={13} />
                <span className="hidden sm:inline">{isPipActive ? 'PiP Active' : 'PiP'}</span>
              </button>
              <button
                type="button"
                className={cn(
                  'btn-ghost btn-xs gap-1',
                  isEditingSettings && 'bg-accent-soft text-accent',
                )}
                onClick={() => setIsEditingSettings(!isEditingSettings)}
                title="Edit timer durations and presets"
              >
                <Edit3 size={13} />
                <span className="hidden sm:inline">Durations</span>
              </button>
              <span className="chip">
                {completedFocus} round{completedFocus === 1 ? '' : 's'}
              </span>
            </div>
          }
        />

        <div className="flex flex-col items-center gap-3.5 p-4">
          {/* Quantum Focus Secondary Toolbar (Never crowds CardHeader!) */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface/60 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPickingTheme(!isPickingTheme)}
                className={cn(
                  'btn-ghost btn-xs gap-1.5 font-medium',
                  isPickingTheme && 'bg-accent-soft text-accent',
                )}
                title="Choose Quantum Theme (Unlocks with Level)"
              >
                <Palette size={13} style={{ color: currentTheme.coreColor }} />
                <span>
                  {currentTheme.icon} {currentTheme.name}
                </span>
              </button>

              <button
                type="button"
                onClick={pickRandomUnlockedTheme}
                className="btn-ghost btn-xs gap-1 text-muted hover:text-ink"
                title="Randomize from unlocked themes"
              >
                <Shuffle size={12} />
                <span className="hidden sm:inline">Shuffle</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCrystalSoundEnabled(!crystalSoundEnabled)}
                className={cn(
                  'btn-ghost btn-xs px-1.5',
                  crystalSoundEnabled ? 'text-accent' : 'text-muted opacity-60',
                )}
                title={
                  crystalSoundEnabled
                    ? 'Subtle minute-change crystallize sound ON'
                    : 'Subtle minute-change crystallize sound OFF'
                }
              >
                {crystalSoundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>

              <button
                type="button"
                onClick={() => setPrefer2DFallback(!prefer2DFallback)}
                className="btn-ghost btn-xs gap-1 text-muted hover:text-ink"
                title="Toggle between 3D Quantum Atom and 2D Ring"
              >
                <Atom size={13} />
                <span className="text-[10px]">{prefer2DFallback ? '2D' : '3D'}</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn-outline btn-xs gap-1 font-semibold"
                title="Launch Immersive Fullscreen Mode"
              >
                <Maximize2 size={12} />
                <span>Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Collapsible Theme & Level Achievement Drawer */}
          {isPickingTheme && (
            <div className="w-full rounded-ctl border border-line bg-surface p-3 space-y-2.5 text-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-line pb-2 font-medium text-ink">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} style={{ color: currentTheme.coreColor }} />
                  Quantum Themes · Level {userLevel} ({unlockedThemes.length}/{QUANTUM_THEMES.length} Unlocked)
                </span>
                <button
                  type="button"
                  className="text-muted hover:text-ink text-[11px]"
                  onClick={() => setIsPickingTheme(false)}
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUANTUM_THEMES.map((t) => {
                  const isUnlocked = t.unlockLevel <= userLevel;
                  const isActive = t.id === currentTheme.id && !prefer2DFallback;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedThemeId(t.id);
                        setPrefer2DFallback(false);
                      }}
                      className={cn(
                        'flex flex-col justify-between rounded-xl border p-2 text-left transition-all',
                        isActive
                          ? 'border-accent bg-accent-soft/50 shadow-sm'
                          : isUnlocked
                            ? 'border-line hover:bg-elevated'
                            : 'border-line/70 bg-surface/60 hover:bg-elevated',
                      )}
                      title={
                        isUnlocked
                          ? `${t.name}: ${t.look}`
                          : `${t.name}: Unlocks into auto-rotation at Level ${t.unlockLevel} (Click to preview)`
                      }
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-ink flex items-center gap-1">
                          <span>{t.icon}</span>
                          <span>{t.name}</span>
                        </span>
                        {isUnlocked ? (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: t.coreColor,
                              boxShadow: `0 0 6px ${t.coreColor}`,
                            }}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-elevated px-1.5 py-0.5 text-[9px] font-semibold text-muted">
                            <Lock size={9} /> Lvl {t.unlockLevel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-muted line-clamp-1">{t.look}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Duration Settings Drawer */}
          {isEditingSettings && (
            <div className="w-full rounded-ctl border border-line bg-surface p-3 space-y-3 text-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-line pb-2 font-medium text-ink">
                <span className="flex items-center gap-1.5">
                  <SettingsIcon size={14} className="text-accent" /> Edit Durations
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
                  <label className="block label">Short Break (min)</label>
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
                  <label className="block label">Long Break (min)</label>
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

          {/* 3D Quantum Focus Atom (Lazy-loaded) with Automatic 2D Ring Fallback */}
          {!prefer2DFallback ? (
            <Suspense fallback={fallback2DRing}>
              <LazyAtomPomodoroScene
                timeText={alerting ? 'DONE!' : `${mm}:${ss}`}
                phaseLabel={PHASE_LABEL[phase]}
                progress={progress}
                running={running}
                alerting={alerting}
                phase={phase}
                theme={currentTheme}
                subjectColor={selectedSubject?.color ?? null}
                subjectCode={selectedSubject?.code ?? null}
                streakDays={streakDays}
                userLevel={userLevel}
                isFullscreen={false}
              />
            </Suspense>
          ) : (
            fallback2DRing
          )}

          {alerting && (
            <button
              type="button"
              className="btn-primary btn-sm animate-fade-in"
              onClick={acknowledgeAlert}
            >
              Got it
            </button>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn-outline btn-xs gap-1 text-muted"
              onClick={() => adjustMinutes(-5)}
              title="Subtract 5 minutes from remaining session"
            >
              <Minus size={13} /> 5m
            </button>

            <button type="button" className="btn-primary gap-1.5" onClick={toggle}>
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? 'Pause' : remaining < total ? 'Resume' : 'Start'}
            </button>

            <button
              type="button"
              className="btn-outline btn-xs gap-1 text-muted"
              onClick={() => adjustMinutes(5)}
              title="Add 5 minutes to remaining session"
            >
              <Plus size={13} /> 5m
            </button>

            {(running || !!usePomodoroStore.getState().startedAt) && phase === 'focus' && (
              <button
                type="button"
                className="btn-outline btn-sm gap-1.5 text-ok border-ok/60 hover:bg-ok/10"
                onClick={submitEarly}
                title="Log elapsed study time and stop the timer"
              >
                <Save size={14} /> Save &amp; Stop
              </button>
            )}

            <button
              type="button"
              className="btn-outline gap-1.5"
              onClick={reset}
              disabled={remaining === cfgTotal && !running && !alerting}
            >
              <RotateCcw size={15} /> Reset
            </button>
            <button
              type="button"
              className="btn-ghost gap-1.5"
              onClick={skip}
              title="Skip without logging the round"
            >
              <SkipForward size={15} /> Skip
            </button>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="label">What are you working on</span>
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Java collections — practice problems"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Subject (syncs electron orbital colour)</span>
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

          <p className={cn('text-center text-[11px] leading-relaxed text-muted')}>
            A focus round is logged when the timer completes or when you click Save &amp; Stop.
            Skipping or resetting records nothing.
          </p>
        </div>
      </Card>
    </>
  );
}
