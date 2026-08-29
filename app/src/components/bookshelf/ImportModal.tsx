/**
 * ImportModal — Native import dialog matching the rest of the application.
 */
import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { useData } from '@/hooks/useMetrics';
import { useFeedbackStore } from '@/store/useFeedbackStore';
import { importBookFromUrl, SUPPORTED_EXTENSIONS } from '@/services/bookImporter';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/misc';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const data = useData();
  const toast = useFeedbackStore((s) => s.toast);
  const importBooks = useBookshelfStore((s) => s.importBooks);
  const importing = useBookshelfStore((s) => s.importing);
  const importProgress = useBookshelfStore((s) => s.importProgress);
  const setBookSubject = useBookshelfStore((s) => s.setBookSubject);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlImporting, setUrlImporting] = useState(false);
  const [results, setResults] = useState<{ name: string; success: boolean; error?: string }[]>([]);
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    const importResults = await importBooks(selectedFiles);

    // If subject was chosen, link all imported books to it
    if (subjectId) {
      for (const res of importResults) {
        if (res.success && res.book) {
          await setBookSubject(res.book.id, subjectId);
        }
      }
    }

    setResults(
      importResults.map((r, i) => ({
        name: selectedFiles[i].name,
        success: r.success,
        error: r.error,
      })),
    );
    setSelectedFiles([]);
    toast({ kind: 'success', title: 'Books imported' });
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlImporting(true);
    const result = await importBookFromUrl(urlInput.trim());
    if (result.success && result.book && subjectId) {
      await setBookSubject(result.book.id, subjectId);
    }
    setResults([{ name: urlInput, success: result.success, error: result.error }]);
    setUrlInput('');
    setUrlImporting(false);
    await useBookshelfStore.getState().loadBooks();
    toast({ kind: 'success', title: 'Book imported from URL' });
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Books"
      description="Add PDF, EPUB, MOBI, AZW3, or TXT files to your study library."
      footer={
        <div className="flex w-full items-center justify-between">
          <button type="button" className="btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
          {tab === 'file' ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleImport}
              disabled={selectedFiles.length === 0 || importing}
            >
              {importing ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Importing...
                </span>
              ) : (
                `Import ${selectedFiles.length > 0 ? selectedFiles.length : ''} ${selectedFiles.length === 1 ? 'Book' : 'Books'}`
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleUrlImport}
              disabled={!urlInput.trim() || urlImporting}
            >
              {urlImporting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Downloading...
                </span>
              ) : (
                'Import from URL'
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1.5 rounded-ctl border border-line bg-surface p-1 text-xs">
          <button
            type="button"
            className={cn(
              'rounded py-1.5 text-center font-medium transition-colors',
              tab === 'file'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-ink',
            )}
            onClick={() => setTab('file')}
          >
            <Upload size={13} className="inline mr-1.5 -mt-0.5" />
            Local Files
          </button>
          <button
            type="button"
            className={cn(
              'rounded py-1.5 text-center font-medium transition-colors',
              tab === 'url'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-ink',
            )}
            onClick={() => setTab('url')}
          >
            <LinkIcon size={13} className="inline mr-1.5 -mt-0.5" />
            Direct URL
          </button>
        </div>

        {/* Link to Subject */}
        <div>
          <label className="block label">Link to Subject (Optional)</label>
          <select
            className="input text-xs"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">No subject linked</option>
            {data.subjects
              .filter((s) => !s.archived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.name}
                </option>
              ))}
          </select>
        </div>

        {/* Tab content */}
        {tab === 'file' ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-6 text-center transition-all',
                dragOver
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-muted hover:bg-elevated/40',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent mb-2">
                <Upload size={20} />
              </div>
              <p className="text-sm font-medium text-ink">
                {dragOver ? 'Drop files here' : 'Drag & drop books or click to browse'}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                PDF, EPUB, MOBI, AZW3, TXT
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUPPORTED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Selected files */}
            {selectedFiles.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-ctl border border-line bg-elevated/40 p-2">
                {selectedFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-ctl bg-surface px-2.5 py-1.5 border border-line text-xs"
                  >
                    <FileText size={14} className="text-accent shrink-0" />
                    <span className="flex-1 truncate text-ink">{file.name}</span>
                    <span className="text-[10px] text-muted tabular">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted hover:text-danger"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {importing && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted mb-1">
                  <span>Importing...</span>
                  <span className="tabular">{Math.round(importProgress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <label className="block label">URL Link *</label>
            <input
              type="url"
              className="input text-xs"
              placeholder="https://example.com/textbook.pdf"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((r, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-ctl px-2.5 py-1.5 text-xs',
                  r.success ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger',
                )}
              >
                {r.success ? <Check size={13} /> : <AlertCircle size={13} />}
                <span className="truncate flex-1">{r.name}</span>
                {r.error && <span className="text-[10px] opacity-80">{r.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
