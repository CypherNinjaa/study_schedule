import { useState, type ReactNode } from 'react';
import { useUiStore } from '@/store/useUiStore';
import { Modal } from './Modal';

/**
 * Global confirmation dialog. Every destructive action routes through
 * `requestConfirm` so nothing is ever deleted without an explicit click.
 */
export function ConfirmDialog() {
  const confirm = useUiStore((s) => s.confirm);
  const close = useUiStore((s) => s.closeConfirm);
  const [busy, setBusy] = useState(false);

  if (!confirm) return null;

  const run = async () => {
    setBusy(true);
    try {
      await confirm.onConfirm();
    } finally {
      setBusy(false);
      close();
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title={confirm.title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={close} disabled={busy}>
            {confirm.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            className={confirm.danger ? 'btn-danger' : 'btn-primary'}
            onClick={run}
            disabled={busy}
            data-autofocus
          >
            {busy ? 'Working…' : (confirm.confirmLabel ?? 'Confirm')}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{confirm.message}</p>
    </Modal>
  );
}

/** Convenience wrapper so callers don't have to reach into the store. */
export function confirmAction(req: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}): void {
  useUiStore.getState().requestConfirm(req);
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-muted">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>
      </div>
      {action}
    </div>
  );
}
