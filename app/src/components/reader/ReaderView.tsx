/**
 * ReaderView — Native, distraction-free reading experience.
 *
 * Clean reader container matching Study Schedule's visual language:
 * - Clean header with back button, book title, linked subject, theme toggles & settings
 * - High performance PDF, EPUB, MOBI/AZW3, TXT readers
 * - Clean footer with reading progress and live study timer
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Maximize2,
  Minimize2,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import type { Book } from '@/types/bookshelf';
import { READER_THEMES } from '@/types/bookshelf';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { useData } from '@/hooks/useMetrics';
import { getBookFile } from '@/services/bookshelfDb';
import { PdfReader } from './PdfReader';
import { EpubReader } from './EpubReader';
import { TxtReader } from './TxtReader';
import { ReaderSettingsPanel } from './ReaderSettingsPanel';
import { EyeComfortPanel } from './EyeComfortPanel';
import { cn } from '@/utils/misc';

interface ReaderViewProps {
  book: Book;
  onClose: () => void;
}

export function ReaderView({ book, onClose }: ReaderViewProps) {
  const data = useData();
  const subject = data.subjects.find((s) => s.id === book.subjectId);

  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEyeComfort, setShowEyeComfort] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionTimer, setSessionTimer] = useState(0);

  const readerSettings = useBookshelfStore((s) => s.readerSettings);
  const setReaderTheme = useBookshelfStore((s) => s.setReaderTheme);
  const eyeComfort = useBookshelfStore((s) => s.eyeComfort);
  const updateBookProgress = useBookshelfStore((s) => s.updateBookProgress);
  const startReadingSession = useBookshelfStore((s) => s.startReadingSession);
  const endReadingSession = useBookshelfStore((s) => s.endReadingSession);

  const theme = READER_THEMES[readerSettings.theme];

  // Load book file data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBookFile(book.id).then((data) => {
      if (cancelled) return;
      setFileData(data ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [book.id]);

  // Start reading session & clean up on exit
  useEffect(() => {
    startReadingSession(book.progress, currentPage);
    return () => {
      endReadingSession(book.id, book.progress, 0);
    };
  }, []);

  // Minute counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTimer((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSettings || showEyeComfort) {
          setShowSettings(false);
          setShowEyeComfort(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showSettings, showEyeComfort, onClose]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleProgressChange = useCallback(
    (progress: number, page: number, location: string) => {
      setCurrentPage(page);
      updateBookProgress(book.id, progress, location);
    },
    [book.id, updateBookProgress],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col transition-colors duration-200"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Brightness overlay */}
      {eyeComfort.brightnessReduction > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-[200]"
          style={{
            backgroundColor: `rgba(0,0,0,${eyeComfort.brightnessReduction / 100})`,
          }}
        />
      )}

      {/* Focus mode vignette */}
      {eyeComfort.focusMode && (
        <div
          className="pointer-events-none fixed inset-0 z-[198]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
          }}
        />
      )}

      {/* Clean Top Bar */}
      <header
        className="flex items-center justify-between border-b px-4 py-2.5"
        style={{
          borderColor: `${theme.text}18`,
          backgroundColor: theme.bg,
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-ctl px-2.5 py-1.5 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ backgroundColor: `${theme.text}0d`, color: theme.text }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                {book.title}
              </h2>
              {subject && (
                <span
                  className="chip text-[10px] shrink-0"
                  style={{
                    borderColor: `${subject.color}40`,
                    background: `${subject.color}15`,
                    color: subject.color,
                  }}
                >
                  {subject.code}
                </span>
              )}
            </div>
            {book.author && (
              <p className="text-[11px] opacity-50 truncate">{book.author}</p>
            )}
          </div>
        </div>

        {/* Reader controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick theme toggles */}
          <button
            type="button"
            onClick={() => setReaderTheme(readerSettings.theme === 'dark' ? 'day' : 'dark')}
            className="rounded-ctl p-2 opacity-60 hover:opacity-100 transition-opacity"
            title="Toggle Day/Dark"
            style={{ color: theme.text }}
          >
            {readerSettings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowEyeComfort(!showEyeComfort);
              setShowSettings(false);
            }}
            className={cn(
              'rounded-ctl p-2 transition-all',
              showEyeComfort ? 'opacity-100 bg-accent-soft text-accent' : 'opacity-60 hover:opacity-100',
            )}
            title="Eye Comfort Settings"
            style={{ color: showEyeComfort ? undefined : theme.text }}
          >
            <Eye size={15} />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowEyeComfort(false);
            }}
            className={cn(
              'rounded-ctl p-2 transition-all',
              showSettings ? 'opacity-100 bg-accent-soft text-accent' : 'opacity-60 hover:opacity-100',
            )}
            title="Typography & Layout Settings"
            style={{ color: showSettings ? undefined : theme.text }}
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-ctl p-2 opacity-60 hover:opacity-100 transition-opacity"
            title="Fullscreen"
            style={{ color: theme.text }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* Reader Content Area */}
      <main className="relative flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <BookOpen size={30} className="animate-pulse opacity-40" />
            <p className="text-xs opacity-50">Loading book...</p>
          </div>
        ) : !fileData ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium opacity-80">Could not load book file.</p>
            <p className="text-xs opacity-50 max-w-sm">
              The file data for "{book.title}" was not saved or was corrupted. Please re-import the file to read.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline btn-sm mt-2"
              style={{ color: theme.text, borderColor: `${theme.text}25` }}
            >
              Back to Library
            </button>
          </div>
        ) : (
          <>
            {book.format === 'pdf' && (
              <PdfReader
                fileData={fileData}
                book={book}
                onProgressChange={handleProgressChange}
              />
            )}
            {book.format === 'epub' && (
              <EpubReader
                fileData={fileData}
                book={book}
                onProgressChange={handleProgressChange}
              />
            )}
            {(book.format === 'txt' || book.format === 'mobi' || book.format === 'azw3') && (
              <TxtReader
                fileData={fileData}
                book={book}
                onProgressChange={handleProgressChange}
              />
            )}
          </>
        )}

        {/* Slide-out settings */}
        {showSettings && <ReaderSettingsPanel onClose={() => setShowSettings(false)} />}
        {showEyeComfort && <EyeComfortPanel onClose={() => setShowEyeComfort(false)} />}
      </main>

      {/* Clean Bottom Bar */}
      <footer
        className="flex items-center justify-between border-t px-4 py-2 text-xs"
        style={{
          borderColor: `${theme.text}18`,
          backgroundColor: theme.bg,
          color: theme.text,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="tabular text-[11px] opacity-60">
            {Math.round(book.progress * 100)}% completed
          </span>
          {sessionTimer > 0 && (
            <span className="text-[11px] opacity-40">
              · {sessionTimer}m reading session
            </span>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mx-4 max-w-xs flex-1">
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: `${theme.text}1a` }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${book.progress * 100}%`,
                backgroundColor: theme.accent,
              }}
            />
          </div>
        </div>

        <span className="text-[11px] opacity-60 tabular">
          {book.format.toUpperCase()}
        </span>
      </footer>
    </div>
  );
}
