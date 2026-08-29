/**
 * TxtReader — Plain text reader with pagination.
 *
 * Splits text content into pages based on viewport size.
 * Also used as fallback for MOBI/AZW3 files (shows raw text).
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Book } from '@/types/bookshelf';
import { READER_THEMES } from '@/types/bookshelf';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/utils/misc';

interface TxtReaderProps {
  fileData: ArrayBuffer;
  book: Book;
  onProgressChange: (progress: number, page: number, location: string) => void;
}

const CHARS_PER_PAGE = 3000; // rough estimate, adjusted by viewport

export function TxtReader({ fileData, book, onProgressChange }: TxtReaderProps) {
  const readerSettings = useBookshelfStore((s) => s.readerSettings);
  const eyeComfort = useBookshelfStore((s) => s.eyeComfort);
  const theme = READER_THEMES[readerSettings.theme];

  const fullText = useMemo(() => new TextDecoder().decode(fileData), [fileData]);

  // Split into pages
  const pages = useMemo(() => {
    const result: string[] = [];
    const charsPerPage = Math.round(
      CHARS_PER_PAGE * (16 / readerSettings.fontSize) * (1.6 / readerSettings.lineSpacing),
    );

    let pos = 0;
    while (pos < fullText.length) {
      let end = Math.min(pos + charsPerPage, fullText.length);
      // Try to break at a paragraph or sentence boundary
      if (end < fullText.length) {
        const paraBreak = fullText.lastIndexOf('\n\n', end);
        if (paraBreak > pos + charsPerPage * 0.6) {
          end = paraBreak + 2;
        } else {
          const sentenceBreak = fullText.lastIndexOf('. ', end);
          if (sentenceBreak > pos + charsPerPage * 0.6) {
            end = sentenceBreak + 2;
          }
        }
      }
      result.push(fullText.slice(pos, end));
      pos = end;
    }

    return result.length > 0 ? result : [''];
  }, [fullText, readerSettings.fontSize, readerSettings.lineSpacing]);

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = parseInt(book.currentLocation || '0', 10);
    return Math.min(saved || 0, pages.length - 1);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const totalPages = pages.length;

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(clamped);
    const progress = (clamped + 1) / totalPages;
    onProgressChange(progress, clamped + 1, String(clamped));
  }, [totalPages, onProgressChange]);

  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showSearch) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextPage(); }
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prevPage, nextPage, showSearch]);

  // Highlight search results
  const highlightedContent = useMemo(() => {
    const text = pages[currentPage] || '';
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '〖$1〗'); // Use markers, then render with spans
  }, [pages, currentPage, searchQuery]);

  const fontFamily = eyeComfort.dyslexiaFont
    ? '"OpenDyslexic", "Comic Sans MS", sans-serif'
    : `"${readerSettings.fontFamily}", Georgia, serif`;

  const marginPx =
    readerSettings.margins === 'narrow' ? 'px-6 sm:px-10' :
    readerSettings.margins === 'wide' ? 'px-12 sm:px-24' :
    'px-8 sm:px-16';

  return (
    <div className="flex h-full flex-col" style={{ background: theme.bg, color: theme.text }}>
      {/* Search bar */}
      {showSearch && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ borderColor: `${theme.text}10` }}
        >
          <Search size={14} style={{ opacity: 0.4 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in text..."
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-30"
            style={{ color: theme.text }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearch(false);
                setSearchQuery('');
              }
            }}
          />
          <button
            type="button"
            onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            className="text-xs opacity-40 hover:opacity-70"
          >
            Close
          </button>
        </div>
      )}

      {/* Text content */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width * 0.3) prevPage();
          else if (x > rect.width * 0.7) nextPage();
        }}
      >
        <div
          ref={contentRef}
          className={cn('mx-auto py-8 sm:py-12', marginPx)}
          style={{
            maxWidth: `${readerSettings.readingWidth}%`,
            fontFamily,
            fontSize: `${readerSettings.fontSize}px`,
            lineHeight: readerSettings.lineSpacing,
            filter: READER_THEMES[readerSettings.theme].filter,
          }}
        >
          {highlightedContent.split('〖').map((segment, i) => {
            if (i === 0) return <span key={i}>{segment}</span>;
            const [highlighted, ...rest] = segment.split('〗');
            return (
              <span key={i}>
                <mark
                  style={{
                    background: `${theme.accent}40`,
                    color: theme.text,
                    borderRadius: '2px',
                    padding: '0 2px',
                  }}
                >
                  {highlighted}
                </mark>
                {rest.join('〗')}
              </span>
            );
          })}
        </div>
      </div>

      {/* Page navigation */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t"
        style={{ borderColor: `${theme.text}10` }}
      >
        <button
          type="button"
          onClick={prevPage}
          disabled={currentPage <= 0}
          className="rounded p-1.5 opacity-40 hover:opacity-70 disabled:opacity-15 transition-opacity"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-xs tabular opacity-40">
          Page {currentPage + 1} of {totalPages}
        </span>

        <button
          type="button"
          onClick={nextPage}
          disabled={currentPage >= totalPages - 1}
          className="rounded p-1.5 opacity-40 hover:opacity-70 disabled:opacity-15 transition-opacity"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
