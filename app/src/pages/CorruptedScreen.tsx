import { useState } from 'react';
import { AlertTriangle, Download, FolderOpen, RotateCcw } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { getCorruptBackup } from '@/services/fileStorage';

/**
 * Shown when a data file fails to parse or validate. The damaged file is left
 * untouched on disk — the app will not adopt it as the save target, so autosave
 * can never overwrite it.
 */
export function CorruptedScreen({ message }: { message: string }) {
  const openExistingFile = useDataStore((s) => s.openExistingFile);
  const resetAllData = useDataStore((s) => s.resetAllData);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const [downloading, setDownloading] = useState(false);

  const downloadRaw = async () => {
    setDownloading(true);
    try {
      const backup = await getCorruptBackup();
      const stamp = (backup?.at ?? new Date().toISOString()).replace(/[:.]/g, '-');
      const blob = new Blob([backup?.text ?? ''], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productivity-data-corrupted-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-bg p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Your data file appears to be corrupted</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              A backup has been created. Nothing was written over your file — it is exactly as it was on disk.
            </p>
            <p className="mt-2 rounded-ctl bg-elevated px-3 py-2 font-mono text-xs text-muted">{message}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button type="button" className="btn-outline w-full justify-start gap-2" onClick={() => void downloadRaw()} disabled={downloading}>
            <Download size={16} />
            {downloading ? 'Preparing…' : 'Download the backup copy'}
          </button>
          <button type="button" className="btn-outline w-full justify-start gap-2" onClick={() => void openExistingFile()}>
            <FolderOpen size={16} />
            Open a different data file
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start gap-2 text-danger hover:bg-danger/10"
            onClick={() =>
              requestConfirm({
                title: 'Start over with empty data?',
                message:
                  'This creates a fresh, empty dataset in the app. Your corrupted file stays on disk untouched, so you can still recover from it later.',
                confirmLabel: 'Start fresh',
                danger: true,
                onConfirm: () => resetAllData(),
              })
            }
          >
            <RotateCcw size={16} />
            Start fresh (keeps the damaged file on disk)
          </button>
        </div>
      </div>
    </div>
  );
}
