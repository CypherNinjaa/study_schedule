/**
 * EpubReader — epub.js based reflowable reader.
 *
 * Renders EPUB content with configurable typography, chapter navigation,
 * and page transitions.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Book as BookType } from '@/types/bookshelf';
import { READER_THEMES } from '@/types/bookshelf';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EpubReaderProps {
  fileData: ArrayBuffer;
  book: BookType;
  onProgressChange: (progress: number, page: number, location: string) => void;
}

export function EpubReader({ fileData, book, onProgressChange }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const readerSettings = useBookshelfStore((s) => s.readerSettings);
  const theme = READER_THEMES[readerSettings.theme];

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return;
    let cancelled = false;

    const initEpub = async () => {
      const ePub = (await import('epubjs')).default;

      const epubBook = ePub(fileData.slice(0));
      bookRef.current = epubBook;

      const rendition = epubBook.renderTo(viewerRef.current!, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated',
      });

      renditionRef.current = rendition;

      // Apply theme
      rendition.themes.default({
        body: {
          'font-family': `${readerSettings.fontFamily}, Georgia, serif !important`,
          'font-size': `${readerSettings.fontSize}px !important`,
          'line-height': `${readerSettings.lineSpacing} !important`,
          'color': `${theme.text} !important`,
          'background-color': `${theme.bg} !important`,
          'padding': readerSettings.margins === 'narrow' ? '10px' : readerSettings.margins === 'wide' ? '60px' : '30px',
          'max-width': `${readerSettings.readingWidth}% !important`,
          'margin': '0 auto !important',
        },
        'p, li, span, div': {
          'color': `${theme.text} !important`,
        },
        'h1, h2, h3, h4, h5, h6': {
          'color': `${theme.text} !important`,
        },
        'a': {
          'color': `${theme.accent} !important`,
        },
      });

      // Navigate to saved location
      if (book.currentLocation) {
        try {
          await rendition.display(book.currentLocation);
        } catch {
          await rendition.display();
        }
      } else {
        await rendition.display();
      }

      // Track location changes
      rendition.on('relocated', (location: any) => {
        if (cancelled) return;
        const cfi = location.start?.cfi || '';
        const progress = location.start?.percentage || 0;
        const page = Math.ceil(progress * (book.totalPages || 100));
        onProgressChange(progress, page, cfi);
      });

      if (!cancelled) setReady(true);
    };

    initEpub();

    return () => {
      cancelled = true;
      if (renditionRef.current) {
        try { renditionRef.current.destroy(); } catch { /* ignore */ }
      }
      if (bookRef.current) {
        try { bookRef.current.destroy(); } catch { /* ignore */ }
      }
    };
  }, [fileData]);

  // Update theme when settings change
  useEffect(() => {
    if (!renditionRef.current) return;
    renditionRef.current.themes.default({
      body: {
        'font-family': `${readerSettings.fontFamily}, Georgia, serif !important`,
        'font-size': `${readerSettings.fontSize}px !important`,
        'line-height': `${readerSettings.lineSpacing} !important`,
        'color': `${theme.text} !important`,
        'background-color': `${theme.bg} !important`,
        'padding': readerSettings.margins === 'narrow' ? '10px' : readerSettings.margins === 'wide' ? '60px' : '30px',
      },
    });
  }, [readerSettings, theme]);

  const prev = useCallback(() => renditionRef.current?.prev(), []);
  const next = useCallback(() => renditionRef.current?.next(), []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next]);

  return (
    <div className="relative flex h-full" style={{ background: theme.bg }}>
      {/* Previous page area */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-0 top-0 z-10 flex h-full w-16 items-center justify-center opacity-0 hover:opacity-40 transition-opacity"
        style={{ color: theme.text }}
      >
        <ChevronLeft size={24} />
      </button>

      {/* EPUB render area */}
      <div
        ref={viewerRef}
        className="flex-1 overflow-hidden"
        style={{
          background: theme.bg,
          fontFamily: readerSettings.fontFamily,
        }}
      />

      {/* Next page area */}
      <button
        type="button"
        onClick={next}
        className="absolute right-0 top-0 z-10 flex h-full w-16 items-center justify-center opacity-0 hover:opacity-40 transition-opacity"
        style={{ color: theme.text }}
      >
        <ChevronRight size={24} />
      </button>

      {/* Loading */}
      {!ready && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: theme.bg }}
        >
          <div className="animate-pulse text-sm" style={{ color: `${theme.text}60` }}>
            Loading chapter...
          </div>
        </div>
      )}
    </div>
  );
}
