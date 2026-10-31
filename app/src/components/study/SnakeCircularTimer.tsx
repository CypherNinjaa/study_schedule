import { useMemo } from 'react';
import { cn } from '@/utils/misc';

export interface SnakeCircularTimerProps {
  /** 0 to 1 fraction of time elapsed */
  progress: number;
  timeText: string;
  phaseLabel: string;
  running?: boolean;
  alerting?: boolean;
  size?: number;
  strokeWidth?: number;
  subjectColor?: string | null;
  subjectCode?: string | null;
  sessionNote?: string | null;
}

const TOTAL_PELLETS = 40;

export function SnakeCircularTimer({
  progress,
  timeText,
  phaseLabel,
  running = false,
  alerting = false,
  size = 240,
  strokeWidth = 9,
  subjectColor,
  subjectCode,
  sessionNote,
}: SnakeCircularTimerProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2 - 24) / 2;
  const circumference = 2 * Math.PI * radius;

  // Head coordinates on circle
  // Starting at -pi/2 (12 o'clock) and moving clockwise
  const angleRad = -Math.PI / 2 + clamped * 2 * Math.PI;
  const headX = cx + radius * Math.cos(angleRad);
  const headY = cy + radius * Math.sin(angleRad);
  const headRotation = clamped * 360;

  // Pellets distributed around the circle
  const pellets = useMemo(() => {
    const list = [];
    for (let i = 0; i < TOTAL_PELLETS; i++) {
      const frac = i / TOTAL_PELLETS;
      const angle = -Math.PI / 2 + frac * 2 * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      list.push({ index: i, frac, x, y });
    }
    return list;
  }, [cx, cy, radius]);

  // Color tokens
  const snakeColor = subjectColor || 'rgb(var(--accent))';
  const trackColor = 'rgba(255, 255, 255, 0.08)';

  // Snake body length
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-hidden
      >
        <defs>
          <filter id="snake-head-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* 1. Base track circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          className="transition-colors"
        />

        {/* 2. Food pellets waiting to be eaten */}
        {pellets.map((p) => {
          // If the snake has eaten or reached this pellet, hide it
          const isEaten = clamped >= p.frac + 0.01;
          const isNextTarget = !isEaten && clamped >= p.frac - 0.04;

          if (isEaten) return null;

          return (
            <circle
              key={p.index}
              cx={p.x}
              cy={p.y}
              r={isNextTarget ? 3.2 : 2.2}
              fill="rgb(var(--accent))"
              opacity={isNextTarget ? 0.95 : 0.4}
              className={cn(
                'transition-all duration-300',
                isNextTarget && running && 'animate-pulse',
              )}
            />
          );
        })}

        {/* 3. The Snake Body (clockwise progress stroke from 12 o'clock) */}
        {clamped > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={snakeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        )}

        {/* 4. Subtle belly scale pattern / spine track */}
        {clamped > 0.04 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(0, 0, 0, 0.2)"
            strokeWidth={2}
            strokeDasharray="2 6"
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}

        {/* 5. The Animated Snake Head */}
        <g
          transform={`translate(${headX}, ${headY}) rotate(${headRotation})`}
          filter="url(#snake-head-shadow)"
        >
          {/* Forked tongue when timer is active and running */}
          {running && (
            <path
              d="M 6.5 0 L 10.5 0 M 10.5 0 L 12.5 -1.5 M 10.5 0 L 12.5 1.5"
              fill="none"
              stroke="#e05252"
              strokeWidth="1.2"
              strokeLinecap="round"
              className="origin-left animate-[tongue_1.2s_ease-in-out_infinite]"
            />
          )}

          {/* Head Body: smooth rounded snout */}
          <path
            d="M -4.5 -5 C 2 -5, 6 -3, 6.5 0 C 6 -3, 2 5, -4.5 5 C -6 3, -6 -3, -4.5 -5 Z"
            fill={snakeColor}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.8"
          />

          {/* Nostrils */}
          <circle cx="5" cy="-1.2" r="0.4" fill="rgba(0,0,0,0.3)" />
          <circle cx="5" cy="1.2" r="0.4" fill="rgba(0,0,0,0.3)" />

          {/* Left Eye */}
          <circle cx="0.5" cy="-3.4" r="1.5" fill="#141416" />
          <circle cx="0.8" cy="-3.7" r="0.6" fill="#ffffff" />

          {/* Right Eye */}
          <circle cx="0.5" cy="3.4" r="1.5" fill="#141416" />
          <circle cx="0.8" cy="3.1" r="0.6" fill="#ffffff" />
        </g>
      </svg>

      {/* Center Information */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
        {subjectCode && (
          <span className="mb-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide bg-elevated/80 border border-line text-muted">
            {subjectCode}
          </span>
        )}

        <div
          className={cn(
            'font-mono text-3xl font-semibold tabular tracking-tight text-ink sm:text-4xl',
            alerting && 'text-warn animate-bounce',
          )}
        >
          {timeText}
        </div>

        <p className="mt-1 text-xs font-medium text-muted">
          {alerting ? 'Session complete!' : phaseLabel}
        </p>

        {sessionNote && (
          <p className="mt-0.5 max-w-[130px] truncate text-[11px] text-faint">
            {sessionNote}
          </p>
        )}
      </div>
    </div>
  );
}

