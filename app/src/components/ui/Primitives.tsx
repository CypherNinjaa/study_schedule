import type { ReactNode } from 'react';
import { cn } from '@/utils/misc';

export function Card({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h3 className="section-title truncate">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'accent',
  className,
  label,
}: {
  /** 0..1 */
  value: number;
  tone?: 'accent' | 'study' | 'code' | 'exercise' | 'warn' | 'danger' | 'ok';
  className?: string;
  label?: string;
}) {
  const pctVal = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tones: Record<string, string> = {
    accent: 'bg-accent',
    study: 'bg-study',
    code: 'bg-code',
    exercise: 'bg-exercise',
    warn: 'bg-warn',
    danger: 'bg-danger',
    ok: 'bg-ok',
  };
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
      role="progressbar"
      aria-valuenow={pctVal}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${pctVal}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 96,
  stroke = 8,
  children,
  tone = 'var(--accent)',
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  tone?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`rgb(${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'card flex items-start gap-3 p-4 text-left',
        onClick && 'transition-colors hover:bg-elevated',
      )}
    >
      {icon && (
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-ctl"
          style={{ background: `rgb(${tone ?? 'var(--accent)'} / 0.12)`, color: `rgb(${tone ?? 'var(--accent)'})` }}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate text-xl font-semibold tabular text-ink">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
      </div>
    </Wrapper>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-ctl border border-line bg-surface p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-[7px] font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-accent text-white' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonPage() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
