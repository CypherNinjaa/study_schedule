import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useFeedbackStore, type ToastKind } from '@/store/useFeedbackStore';
import { cn } from '@/utils/misc';

const ICONS: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const TONES: Record<ToastKind, string> = {
  success: 'text-ok',
  info: 'text-accent',
  warning: 'text-warn',
  error: 'text-danger',
};

export function Toaster() {
  const toasts = useFeedbackStore((s) => s.toasts);
  const dismiss = useFeedbackStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-card border border-line bg-elevated px-4 py-3 shadow-pop"
          >
            <Icon size={18} className={cn('mt-0.5 shrink-0', TONES[t.kind])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{t.message}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-accent hover:underline"
                  onClick={() => {
                    t.action?.run();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-faint hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Small "+12 XP" numbers that drift up near the top bar after an award. */
export function XPFloats() {
  const floats = useFeedbackStore((s) => s.xpFloats);
  if (floats.length === 0) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-[70] flex -translate-x-1/2 flex-col items-center gap-1">
      {floats.map((f) => (
        <span
          key={f.id}
          className="animate-xp-float rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-sm font-semibold text-accent shadow-card"
        >
          +{f.amount} {f.label}
        </span>
      ))}
    </div>
  );
}
