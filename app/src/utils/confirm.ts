import { useUiStore } from '@/store/useUiStore';

/**
 * Ask for confirmation before a destructive action. Lives outside the dialog
 * component so callers don't have to reach into the UI store, and so the
 * component file stays component-only.
 */
export function confirmAction(req: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}): void {
  useUiStore.getState().requestConfirm(req);
}
