import { useEffect, useRef, useState } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Crown,
  Edit2,
  Flame,
  Headphones,
  Leaf,
  Minimize2,
  Minus,
  Palette,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  SkipForward,
  Sparkles,
  Sprout,
  Volume2,
  Zap,
} from 'lucide-react';
import { usePomodoroStore, type PomodoroPhase } from '@/store/usePomodoroStore';
import { useData } from '@/hooks/useMetrics';
import { burstCanvasConfetti } from '@/utils/confetti';
import {
  playAmbientSound,
  stopAmbientSound,
  type AmbientSoundType,
} from '@/utils/ambientAudio';
import { cn } from '@/utils/misc';

interface RgbTheme {
  id: string;
  name: string;
  stops: [string, string, string, string];
  glow: string;
}

const RGB_THEMES: RgbTheme[] = [
  {
    id: 'cyber',
    name: 'Cyber Chroma',
    stops: ['#ff007f', '#7928ca', '#0070f3', '#00dfd8'],
    glow: 'rgba(121, 40, 202, 0.4)',
  },
  {
    id: 'aurora',
    name: 'Aurora Neon',
    stops: ['#00f5a0', '#00d9f5', '#6366f1', '#ec4899'],
    glow: 'rgba(0, 217, 245, 0.4)',
  },
  {
    id: 'sunset',
    name: 'Sunset Blaze',
    stops: ['#ff3366', '#ff6b35', '#f7c544', '#7928ca'],
    glow: 'rgba(255, 107, 53, 0.4)',
  },
  {
    id: 'matrix',
    name: 'Emerald Matrix',
    stops: ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'],
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'galaxy',
    name: 'Galactic Violet',
    stops: ['#8b5cf6', '#d946ef', '#3b82f6', '#06b6d4'],
    glow: 'rgba(217, 70, 239, 0.4)',
  },
];

interface FocusMilestone {
  threshold: number; // 0, 0.25, 0.5, 0.75, 1.0
  name: string;
  stageName: string;
  icon: typeof Sprout;
  color: string;
  glowColor: string;
  description: string;
}

const MILESTONES: FocusMilestone[] = [
  {
    threshold: 0,
    name: 'Seed',
    stageName: 'Stage 1 · Seed',
    icon: Sprout,
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    description: 'Beginning focus block',
  },
  {
    threshold: 0.25,
    name: 'Sprout',
    stageName: 'Stage 2 · Momentum',
    icon: Leaf,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    description: 'First 25% completed',
  },
  {
    threshold: 0.5,
    name: 'Flow',
    stageName: 'Stage 3 · Deep Flow',
    icon: Zap,
    color: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    description: 'Halfway! Peak concentration',
  },
  {
    threshold: 0.75,
    name: 'Fire',
    stageName: 'Stage 4 · Hyper Focus',
    icon: Flame,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    description: 'Final stretch! Push through',
  },
  {
    threshold: 1.0,
    name: 'Crown',
    stageName: 'Stage 5 · Mastery',
    icon: Crown,
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.6)',
    description: 'Round mastered! +15 XP',
  },
];

const PRESETS = [15, 25, 45, 50];

export function PipTimerView({ onReturnToTab }: { onReturnToTab: () => void }) {
  const data = useData();
  const cfg = data.settings.pomodoro;

  const phase = usePomodoroStore((s) => s.phase);
  const running = usePomodoroStore((s) => s.running);
  const remaining = usePomodoroStore((s) => s.remaining);
  const displayTotal = usePomodoroStore((s) => s.displayTotal);
  const completedFocus = usePomodoroStore((s) => s.completedFocus);
  const label = usePomodoroStore((s) => s.label);
  const subjectId = usePomodoroStore((s) => s.subjectId);
  const alerting = usePomodoroStore((s) => s.alerting);

  const setLabel = usePomodoroStore((s) => s.setLabel);
  const toggle = usePomodoroStore((s) => s.toggle);
  const resetStore = usePomodoroStore((s) => s.reset);
  const skipStore = usePomodoroStore((s) => s.skip);
  const adjustMinutes = usePomodoroStore((s) => s.adjustMinutes);
  const setRemaining = usePomodoroStore((s) => s.setRemaining);
  const submitEarly = usePomodoroStore((s) => s.submitEarly);
  const acknowledgeAlert = usePomodoroStore((s) => s.acknowledgeAlert);

  const [isCompact, setIsCompact] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>('off');
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMilestoneRef = useRef<number>(0);

  const currentTheme = RGB_THEMES[themeIndex % RGB_THEMES.length];

  const cycleRgbTheme = () => {
    setThemeIndex((prev) => (prev + 1) % RGB_THEMES.length);
  };

  const cfgTotal =
    (phase === 'focus'
      ? cfg.focusMinutes
      : phase === 'break'
        ? cfg.breakMinutes
        : cfg.longBreakMinutes) * 60;
  const total = Math.max(displayTotal, cfgTotal, remaining, 1);
  const progress = Math.min(1, Math.max(0, (total - remaining) / total));

  // Determine current active milestone
  let currentMilestone = MILESTONES[0];
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (progress >= MILESTONES[i].threshold) {
      currentMilestone = MILESTONES[i];
      break;
    }
  }

  // Handle window resizing and aligning in the bottom-right corner when toggling compact view
  const toggleCompactView = () => {
    const nextCompact = !isCompact;
    setIsCompact(nextCompact);
    try {
      if (typeof window !== 'undefined') {
        const screenWidth = window.screen.availWidth || 1920;
        const screenHeight = window.screen.availHeight || 1080;

        if (nextCompact) {
          const w = 290;
          const h = 110;
          if ('resizeTo' in window) window.resizeTo(w, h);
          if ('moveTo' in window) window.moveTo(screenWidth - w - 24, screenHeight - h - 50);
        } else {
          const w = 340;
          const h = 270;
          if ('resizeTo' in window) window.resizeTo(w, h);
          if ('moveTo' in window) window.moveTo(screenWidth - w - 24, screenHeight - h - 50);
        }
      }
    } catch {
      // ignore
    }
  };

  // Detect milestone transitions and trigger micro burst
  useEffect(() => {
    if (!running) return;
    const currentTier = MILESTONES.findIndex((m) => m === currentMilestone);
    if (currentTier > lastMilestoneRef.current && canvasRef.current && currentTier > 0) {
      lastMilestoneRef.current = currentTier;
      burstCanvasConfetti(canvasRef.current);
    }
  }, [currentMilestone, running]);

  // Ambient sound management
  useEffect(() => {
    if (running && phase === 'focus' && ambientSound !== 'off') {
      playAmbientSound(ambientSound);
    } else {
      stopAmbientSound();
    }
    return () => {
      stopAmbientSound();
    };
  }, [running, phase, ambientSound]);

  // Confetti on alert
  useEffect(() => {
    if (alerting && canvasRef.current) {
      burstCanvasConfetti(canvasRef.current);
    }
  }, [alerting]);

  const handleSaveEarly = () => {
    if (canvasRef.current) {
      burstCanvasConfetti(canvasRef.current);
    }
    submitEarly();
  };

  const handlePresetSelect = (minutes: number) => {
    setRemaining(minutes * 60, minutes * 60);
  };

  const reset = () => {
    resetStore(cfgTotal);
    lastMilestoneRef.current = 0;
  };

  const skip = () => {
    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus';
    const nextSec = (nextPhase === 'focus' ? cfg.focusMinutes : cfg.breakMinutes) * 60;
    skipStore(nextPhase, nextSec);
    lastMilestoneRef.current = 0;
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const subject = data.subjects.find((s) => s.id === subjectId);

  // Spacious Ring Geometry (Radius = 64, ViewBox 160x160)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Tip Orbit Position (Center 80, 80)
  const angle = (progress * 360 - 90) * (Math.PI / 180);
  const tipX = 80 + radius * Math.cos(angle);
  const tipY = 80 + radius * Math.sin(angle);

  // Round indicator dots
  const roundCycle = cfg.roundsBeforeLongBreak || 4;
  const currentInCycle = completedFocus % roundCycle;

  const ActiveIcon = currentMilestone.icon;

  /* =========================================================================
     COMPACT VIEW (Snug, Ultra-Slim Minimalist Pill Mode with 0 Giant Gaps)
     ========================================================================= */
  if (isCompact) {
    return (
      <div className="relative flex h-screen w-screen select-none flex-col justify-center gap-1.5 overflow-hidden bg-slate-950 px-3 py-2 text-slate-100 font-sans">
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-50 h-full w-full" />

        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-50 transition-all duration-700"
          style={{
            background: alerting
              ? 'radial-gradient(circle at center, rgba(245,158,11,0.35) 0%, transparent 80%)'
              : `radial-gradient(circle at center, ${currentTheme.glow} 0%, transparent 80%)`,
          }}
        />

        {/* Top Slim Row */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-bold shrink-0"
              style={{
                borderColor: `${currentMilestone.color}50`,
                background: `${currentMilestone.color}15`,
                color: currentMilestone.color,
              }}
            >
              <ActiveIcon size={11} className={cn(running && 'animate-pulse')} />
              <span className="truncate max-w-[55px]">{currentMilestone.name}</span>
            </div>

            <span
              className={cn(
                'text-2xl font-black tabular leading-none font-mono text-white tracking-tight',
                alerting && 'text-amber-400 animate-timer-alert',
              )}
            >
              {alerting ? 'Done!' : `${mm}:${ss}`}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full shadow transition-all active:scale-90',
                running
                  ? 'border border-indigo-400/60 bg-indigo-500/20 text-indigo-300'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30',
              )}
              onClick={toggle}
              title={running ? 'Pause timer' : 'Start focus timer'}
            >
              {running ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
            </button>

            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              onClick={toggleCompactView}
              title="Expand to Full View"
            >
              <ChevronsUpDown size={13} />
            </button>

            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              onClick={onReturnToTab}
              title="Return to main window"
            >
              <Minimize2 size={13} />
            </button>
          </div>
        </div>

        {/* Dynamic RGB Progress Bar Line */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800/80">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: `linear-gradient(90deg, ${currentTheme.stops.join(', ')})`,
              boxShadow: `0 0 8px ${currentTheme.stops[0]}`,
            }}
          />
        </div>

        {/* Bottom Micro Row */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <div className="min-w-0 flex-1 truncate text-slate-400">
            {isEditingLabel ? (
              <input
                type="text"
                autoFocus
                className="h-5 w-full rounded border border-indigo-500/50 bg-slate-900 px-1 text-[10px] text-slate-100 outline-none"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => setIsEditingLabel(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingLabel(false)}
              />
            ) : (
              <span
                onClick={() => setIsEditingLabel(true)}
                className="cursor-pointer hover:text-slate-200 truncate inline-block max-w-[120px]"
                title="Click to edit task"
              >
                {label.trim() || (phase === 'focus' ? 'Focus task...' : 'Break')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="rounded px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              onClick={() => adjustMinutes(-5)}
              title="Minus 5m"
            >
              -5m
            </button>
            <button
              type="button"
              className="rounded px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              onClick={() => adjustMinutes(5)}
              title="Plus 5m"
            >
              +5m
            </button>
            {phase === 'focus' && (running || !!usePomodoroStore.getState().startedAt) && (
              <button
                type="button"
                className="rounded px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-semibold hover:bg-emerald-500/30"
                onClick={handleSaveEarly}
                title="Save & stop"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     FULL RICH RGB GLOW VIEW (Spacious Non-Overlapping Layout)
     ========================================================================= */
  return (
    <div className="relative flex h-screen w-screen select-none flex-col justify-between overflow-hidden bg-slate-950 p-2.5 text-slate-100 font-sans">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-50 h-full w-full" />

      {/* Dynamic RGB Ambient background glow aura */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-700 opacity-60"
        style={{
          background: alerting
            ? 'radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, transparent 70%)'
            : `radial-gradient(circle at center, ${currentTheme.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Active Stage Icon Badge */}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-bold transition-all shadow-sm"
            style={{
              borderColor: `${currentMilestone.color}50`,
              background: `${currentMilestone.color}15`,
              color: currentMilestone.color,
            }}
            title={currentMilestone.description}
          >
            <ActiveIcon size={11} className={cn(running && 'animate-pulse')} />
            <span className="truncate max-w-[85px]">{currentMilestone.name} Stage</span>
          </div>

          {subject && (
            <span
              className="chip text-[10px] py-0 px-1.5 truncate max-w-[65px] rounded border"
              style={{
                borderColor: `${subject.color}50`,
                background: `${subject.color}20`,
                color: subject.color,
              }}
            >
              {subject.code}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* RGB Theme Color Switcher */}
          <button
            type="button"
            onClick={cycleRgbTheme}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={`RGB Theme: ${currentTheme.name} (Click to switch colors)`}
          >
            <Palette size={12} className="text-pink-400" />
          </button>

          {/* Ambient Flow Audio Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAmbientMenu(!showAmbientMenu)}
              className={cn(
                'rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors',
                ambientSound !== 'off' && 'text-indigo-400 bg-indigo-500/20',
              )}
              title="Ambient Audio for Focus"
            >
              {ambientSound === 'off' ? <Headphones size={12} /> : <Volume2 size={12} />}
            </button>

            {showAmbientMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 flex w-28 flex-col rounded-lg border border-slate-800 bg-slate-900/95 p-1 shadow-pop backdrop-blur text-[10px] animate-fade-in">
                <button
                  type="button"
                  className={cn(
                    'rounded px-2 py-1 text-left hover:bg-slate-800',
                    ambientSound === 'off' && 'text-indigo-400 font-bold',
                  )}
                  onClick={() => {
                    setAmbientSound('off');
                    setShowAmbientMenu(false);
                  }}
                >
                  Mute Audio
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-2 py-1 text-left hover:bg-slate-800',
                    ambientSound === 'rain' && 'text-indigo-400 font-bold',
                  )}
                  onClick={() => {
                    setAmbientSound('rain');
                    setShowAmbientMenu(false);
                  }}
                >
                  Gentle Rain
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-2 py-1 text-left hover:bg-slate-800',
                    ambientSound === 'flow' && 'text-indigo-400 font-bold',
                  )}
                  onClick={() => {
                    setAmbientSound('flow');
                    setShowAmbientMenu(false);
                  }}
                >
                  40Hz Gamma Flow
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded px-2 py-1 text-left hover:bg-slate-800',
                    ambientSound === 'whitenoise' && 'text-indigo-400 font-bold',
                  )}
                  onClick={() => {
                    setAmbientSound('whitenoise');
                    setShowAmbientMenu(false);
                  }}
                >
                  White Noise
                </button>
              </div>
            )}
          </div>

          {/* Round cycle dots */}
          <div
            className="flex items-center gap-0.5"
            title={`${completedFocus} rounds done today (${currentInCycle}/${roundCycle})`}
          >
            {Array.from({ length: roundCycle }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 w-1 rounded-full transition-all',
                  i < currentInCycle
                    ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]'
                    : 'bg-slate-800',
                )}
              />
            ))}
          </div>

          {/* Compact View Switcher Button */}
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            onClick={toggleCompactView}
            title="Switch to Compact View"
          >
            <ChevronsDownUp size={13} />
          </button>

          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            onClick={onReturnToTab}
            title="Return to main window"
          >
            <Minimize2 size={13} />
          </button>
        </div>
      </div>

      {/* Spacious Hero RGB Glow Ring & Timer */}
      <div className="my-auto flex flex-col items-center justify-center py-0.5">
        <div
          className={cn(
            'relative flex items-center justify-center transition-transform',
            running && !alerting && 'animate-breath',
          )}
        >
          {/* SVG Glow Ring with Dynamic RGB Gradient & Translucent Glow Fill */}
          <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 160 160">
            <defs>
              {/* Dynamic 4-stop RGB Linear Gradient */}
              <linearGradient id="rgbChromaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={currentTheme.stops[0]} />
                <stop offset="33%" stopColor={currentTheme.stops[1]} />
                <stop offset="66%" stopColor={currentTheme.stops[2]} />
                <stop offset="100%" stopColor={currentTheme.stops[3]} />
              </linearGradient>

              {/* Translucent RGB Inner Fill Glow */}
              <radialGradient id="rgbInnerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={currentTheme.stops[0]} stopOpacity="0.22" />
                <stop offset="70%" stopColor={currentTheme.stops[1]} stopOpacity="0.10" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>

              {/* Alert Gradient */}
              <linearGradient id="alertGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* Translucent RGB Inner Circle Fill */}
            <circle
              cx="80"
              cy="80"
              r={radius - 4}
              fill="url(#rgbInnerGlow)"
            />

            {/* Background Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-800/80"
              fill="transparent"
            />

            {/* RGB Progress Stroke */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={alerting ? 'url(#alertGradient)' : 'url(#rgbChromaGradient)'}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-out"
              style={{
                filter: alerting
                  ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))'
                  : `drop-shadow(0 0 10px ${currentTheme.stops[1]})`,
              }}
            />

            {/* Radiant Orbit Glow Particle at Arc Tip */}
            {progress > 0.01 && progress < 0.99 && (
              <circle
                cx={tipX}
                cy={tipY}
                r="4.5"
                fill={currentTheme.stops[0]}
                className="animate-pulse"
                style={{
                  filter: `drop-shadow(0 0 8px ${currentTheme.stops[0]}) drop-shadow(0 0 14px ${currentTheme.stops[2]})`,
                }}
              />
            )}
          </svg>

          {/* Clean Non-Overlapping Inner Time & Status */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {/* Bold Tabular Time */}
            <span
              className={cn(
                'text-3xl font-black tracking-tight tabular leading-none font-mono text-white',
                alerting && 'text-amber-400 animate-timer-alert',
              )}
            >
              {alerting ? 'Done!' : `${mm}:${ss}`}
            </span>

            {/* Clean 1-Line Status Pill (Never wraps or overflows) */}
            <span
              className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-900/80 border border-slate-800 transition-colors shadow-sm"
              style={{ color: currentMilestone.color }}
            >
              {alerting ? 'Completed' : running ? currentMilestone.name : 'Paused'}
            </span>
          </div>
        </div>

        {/* Milestone Checkpoint Evolution Track (Outside the Circle) */}
        {phase === 'focus' && (
          <div className="mt-1.5 flex items-center justify-center gap-1.5">
            {MILESTONES.map((m, idx) => {
              const Icon = m.icon;
              const isUnlocked = progress >= m.threshold;
              const isCurrent = currentMilestone === m;
              return (
                <div
                  key={m.name}
                  className="flex items-center gap-0.5"
                  title={`${m.name}: ${m.description}`}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border transition-all',
                      isUnlocked
                        ? 'border-transparent shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 opacity-30',
                      isCurrent && 'scale-110 ring-2 ring-indigo-400/40',
                    )}
                    style={
                      isUnlocked
                        ? {
                            backgroundColor: `${m.color}25`,
                            borderColor: `${m.color}60`,
                            color: m.color,
                            boxShadow: `0 0 8px ${m.glowColor}`,
                          }
                        : undefined
                    }
                  >
                    <Icon size={9} />
                  </div>
                  {idx < MILESTONES.length - 1 && (
                    <div
                      className={cn(
                        'h-0.5 w-1.5 rounded transition-colors',
                        progress >= MILESTONES[idx + 1].threshold
                          ? 'bg-indigo-400 shadow-[0_0_4px_rgba(99,102,241,0.8)]'
                          : 'bg-slate-800',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Interactive Session Task Name */}
        <div className="mt-1 w-full max-w-[240px] text-center">
          {isEditingLabel ? (
            <input
              type="text"
              autoFocus
              className="h-5 w-full rounded border border-indigo-500/50 bg-slate-900 px-2 text-center text-xs text-slate-100 outline-none focus:ring-1 focus:ring-indigo-400"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => setIsEditingLabel(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingLabel(false)}
              placeholder="What are you working on?"
            />
          ) : (
            <p
              onClick={() => setIsEditingLabel(true)}
              className="group inline-flex items-center justify-center gap-1 cursor-pointer truncate text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              title="Click to edit task name"
            >
              <span className="truncate max-w-[180px]">
                {label.trim() || (phase === 'focus' ? 'Click to set task' : 'Break time')}
              </span>
              <Edit2 size={9} className="opacity-40 group-hover:opacity-100 shrink-0" />
            </p>
          )}
        </div>

        {/* Quick Presets (when idle/paused) */}
        {!running && !alerting && (
          <div className="mt-1 flex items-center justify-center gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[9px] font-semibold transition-all',
                  total === p * 60
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80',
                )}
              >
                {p}m
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="border-t border-slate-800/80 pt-1.5">
        {alerting ? (
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-xs text-white shadow-lg shadow-amber-500/25 transition-transform hover:scale-[1.02] active:scale-95"
            onClick={acknowledgeAlert}
          >
            <Sparkles size={13} /> Claim +15 XP
          </button>
        ) : (
          <div className="flex items-center justify-between gap-1">
            {/* Time Adjustments */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex h-6 items-center rounded border border-slate-800 bg-slate-900/80 px-1.5 text-[10px] font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
                onClick={() => adjustMinutes(-5)}
                title="Subtract 5 minutes"
              >
                <Minus size={10} className="mr-0.5" /> 5m
              </button>

              <button
                type="button"
                className="flex h-6 items-center rounded border border-slate-800 bg-slate-900/80 px-1.5 text-[10px] font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
                onClick={() => adjustMinutes(5)}
                title="Add 5 minutes"
              >
                <Plus size={10} className="mr-0.5" /> 5m
              </button>
            </div>

            {/* Play / Pause Hero Button */}
            <button
              type="button"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all active:scale-90',
                running
                  ? 'border border-indigo-400/60 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 hover:scale-105',
              )}
              onClick={toggle}
              title={running ? 'Pause timer' : 'Start focus timer'}
            >
              {running ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
            </button>

            {/* Actions: Save, Reset, Skip */}
            <div className="flex items-center gap-1">
              {phase === 'focus' && (running || !!usePomodoroStore.getState().startedAt) && (
                <button
                  type="button"
                  className="flex h-6 items-center gap-1 rounded border border-emerald-500/50 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
                  onClick={handleSaveEarly}
                  title="Save elapsed focus minutes and complete session"
                >
                  <Save size={11} /> Save
                </button>
              )}

              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                onClick={reset}
                title="Reset timer"
              >
                <RotateCcw size={12} />
              </button>

              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                onClick={skip}
                title="Skip to next phase"
              >
                <SkipForward size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
