/**
 * PdfReader — High-performance PDF.js reader with direct canvas rendering.
 *
 * Supports continuous scroll, single-page, two-page spread, and zoom controls.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Book } from '@/types/bookshelf';
import { useBookshelfStore } from '@/store/useBookshelfStore';
import { READER_THEMES } from '@/types/bookshelf';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Columns,
  AlignJustify,
  FileText,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/utils/misc';
import { Pdf3DFlipBook } from './Pdf3DFlipBook';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

interface PdfReaderProps {
  fileData: ArrayBuffer;
  book: Book;
  onProgressChange: (progress: number, page: number, location: string) => void;
}

/* ------------------------------------------------------------------
   Individual PDF Page Item
------------------------------------------------------------------ */

function PdfPageItem({
  pdf,
  pageNum,
  zoom,
}: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !pdf) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore cancellation error
      }
    }

    setLoading(true);

    pdf.getPage(pageNum).then((page) => {
      if (cancelled || !canvas) return;

      const baseScale = 1.5;
      const viewport = page.getViewport({ scale: baseScale * zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / 1.5}px`;
      canvas.style.height = `${viewport.height / 1.5}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const renderTask = (page as any).render(renderContext);
      renderTaskRef.current = renderTask;

      renderTask.promise
        .then(() => {
          if (!cancelled) setLoading(false);
        })
        .catch((err: any) => {
          if (err?.name !== 'RenderingCancelledException') {
            console.error('Page render error:', err);
          }
        });
    });

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdf, pageNum, zoom]);

  return (
    <div className="relative rounded shadow-md overflow-hidden border border-black/10 bg-white">
      <canvas ref={canvasRef} className="block" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <span className="text-xs text-muted">Rendering page {pageNum}...</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Main PdfReader Component
------------------------------------------------------------------ */

export function PdfReader({ fileData, book, onProgressChange }: PdfReaderProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = book.currentLocation;
    return saved ? parseInt(saved, 10) || 1 : 1;
  });
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const containerRef = useRef<HTMLDivElement>(null);

  const readerSettings = useBookshelfStore((s) => s.readerSettings);
  const setReaderSettings = useBookshelfStore((s) => s.setReaderSettings);
  const theme = READER_THEMES[readerSettings.theme];
  const zoom = readerSettings.pdfZoom / 100;
  const viewMode = readerSettings.pdfViewMode;

  useEffect(() => {
    let cancelled = false;
    pdfjsLib.getDocument({ data: new Uint8Array(fileData.slice(0)) }).promise.then((doc) => {
      if (cancelled) return;
      setPdf(doc);
      setTotalPages(doc.numPages);
    });
    return () => {
      cancelled = true;
    };
  }, [fileData]);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
      const progress = clamped / totalPages;
      onProgressChange(progress, clamped, String(clamped));
    },
    [totalPages, onProgressChange],
  );

  const prevPage = useCallback(
    () => goToPage(currentPage - (viewMode === 'double' ? 2 : 1)),
    [currentPage, viewMode, goToPage],
  );
  const nextPage = useCallback(
    () => goToPage(currentPage + (viewMode === 'double' ? 2 : 1)),
    [currentPage, viewMode, goToPage],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevPage();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prevPage, nextPage]);

  const handleZoomIn = () =>
    setReaderSettings({ pdfZoom: Math.min(readerSettings.pdfZoom + 25, 250) });
  const handleZoomOut = () =>
    setReaderSettings({ pdfZoom: Math.max(readerSettings.pdfZoom - 25, 50) });

  // Calculate visible pages
  const visiblePages: number[] = [];
  if (viewMode === 'scroll') {
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 2); i++) {
      visiblePages.push(i);
    }
  } else if (viewMode === 'double') {
    visiblePages.push(currentPage);
    if (currentPage + 1 <= totalPages) visiblePages.push(currentPage + 1);
  } else {
    visiblePages.push(currentPage);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Sub-toolbar */}
      <div
        className="flex items-center justify-between border-b px-4 py-1.5 text-xs shrink-0"
        style={{
          borderColor: `${theme.text}12`,
          backgroundColor: `${theme.text}05`,
        }}
      >
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="rounded p-1 opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) goToPage(val);
              }}
              min={1}
              max={totalPages}
              className="w-11 rounded border px-1.5 py-0.5 text-center text-xs tabular font-medium"
              style={{
                borderColor: `${theme.text}20`,
                backgroundColor: theme.bg,
                color: theme.text,
              }}
            />
            <span className="text-[11px] opacity-40">/ {totalPages}</span>
          </div>
          <button
            type="button"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="rounded p-1 opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity"
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* View mode & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {([
              { mode: 'flip' as const, icon: BookOpen, label: '3D Book Flip' },
              { mode: 'single' as const, icon: FileText, label: 'Single Page' },
              { mode: 'double' as const, icon: Columns, label: 'Two Pages' },
              { mode: 'scroll' as const, icon: AlignJustify, label: 'Continuous' },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setReaderSettings({ pdfViewMode: mode })}
                title={label}
                className={cn(
                  'rounded p-1 transition-all',
                  viewMode === mode
                    ? 'opacity-100 font-bold bg-accent-soft text-accent'
                    : 'opacity-40 hover:opacity-70',
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px" style={{ backgroundColor: `${theme.text}18` }} />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="rounded p-1 opacity-50 hover:opacity-100"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="min-w-[4ch] text-center text-[11px] tabular opacity-60">
              {readerSettings.pdfZoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="rounded p-1 opacity-50 hover:opacity-100"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Pages Container */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1',
          viewMode === 'flip' ? 'overflow-hidden p-2 flex items-center justify-center' : 'overflow-auto p-4 sm:p-6',
        )}
        style={{ backgroundColor: theme.bg }}
      >
        {pdf ? (
          viewMode === 'flip' ? (
            <Pdf3DFlipBook
              pdf={pdf}
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              onPageChange={goToPage}
            />
          ) : (
            <div
              className={cn(
                'mx-auto',
                viewMode === 'double'
                  ? 'flex items-start justify-center gap-4'
                  : 'flex flex-col items-center gap-4',
              )}
            >
              {visiblePages.map((pageNum) => (
                <PdfPageItem
                  key={`pdf-page-${pageNum}-${zoom}`}
                  pdf={pdf}
                  pageNum={pageNum}
                  zoom={zoom}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex h-64 items-center justify-center opacity-40">
            <span className="text-xs">Loading PDF document...</span>
          </div>
        )}
      </div>
    </div>
  );
}
