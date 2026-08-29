/**
 * Pdf3DFlipBook — Responsive 3D Book Page Flip Engine for PDF.
 *
 * Features:
 * - Auto-fits the window container (no cutoff, no clipping, aspect-ratio preserved)
 * - True bidirectional 3D page flip (Left-to-Right & Right-to-Left)
 * - Dynamic lighting & realistic spine crease
 * - Responsive 2-page spread (desktop) and 1-page (mobile)
 * - Click edge zones, bottom buttons, and keyboard navigation
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Pdf3DFlipBookProps {
  pdf: PDFDocumentProxy;
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
}

/* ------------------------------------------------------------------
   Direct PDF Page Canvas (with exact aspect ratio)
------------------------------------------------------------------ */

function PdfCanvas({
  pdf,
  pageNum,
  width,
  height,
  className,
}: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  width: number;
  height: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !pdf || pageNum < 1 || pageNum > pdf.numPages || width <= 0 || height <= 0) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }

    setReady(false);

    pdf.getPage(pageNum).then((page) => {
      if (cancelled || !canvas) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      // Calculate scale so the page fits width x height exactly
      const scaleX = width / unscaledViewport.width;
      const scaleY = height / unscaledViewport.height;
      const scale = Math.min(scaleX, scaleY);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

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
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          // ignore render cancellation
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
  }, [pdf, pageNum, width, height]);

  if (pageNum < 1 || pageNum > pdf.numPages) {
    return <div className="h-full w-full bg-[#fdfcf9]" />;
  }

  return (
    <div
      className={`relative flex items-center justify-center bg-white overflow-hidden ${className ?? ''}`}
      style={{ width, height }}
    >
      <canvas ref={canvasRef} className="block object-contain" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <span className="text-[11px] text-muted animate-pulse">Page {pageNum}...</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   3D Book Flip Main Component
------------------------------------------------------------------ */

export function Pdf3DFlipBook({
  pdf,
  currentPage,
  totalPages,
  zoom,
  onPageChange,
}: Pdf3DFlipBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ pageWidth: 380, pageHeight: 540 });
  const [pageAspect, setPageAspect] = useState(0.707); // Default A4 aspect ratio

  // Measure first page to get true PDF aspect ratio
  useEffect(() => {
    if (!pdf) return;
    pdf.getPage(1).then((page) => {
      const vp = page.getViewport({ scale: 1.0 });
      if (vp.width && vp.height) {
        setPageAspect(vp.width / vp.height);
      }
    });
  }, [pdf]);

  // Auto-fit calculation based on window / container size
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availW = Math.max(320, rect.width - 40);
      const availH = Math.max(300, rect.height - 70);

      // We have a 2-page spread: total width = 2 * pageWidth
      const maxSinglePageW = availW / 2;
      const maxSinglePageH = availH;

      let pHeight = maxSinglePageH;
      let pWidth = pHeight * pageAspect;

      if (pWidth > maxSinglePageW) {
        pWidth = maxSinglePageW;
        pHeight = pWidth / pageAspect;
      }

      // Apply user zoom
      pWidth = Math.round(pWidth * zoom);
      pHeight = Math.round(pHeight * zoom);

      setDimensions({ pageWidth: pWidth, pageHeight: pHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [pageAspect, zoom]);

  const { pageWidth, pageHeight } = dimensions;

  // Book pages calculation
  const isCover = currentPage === 1;
  const leftPageNum = isCover ? 0 : currentPage % 2 === 0 ? currentPage : currentPage - 1;
  const rightPageNum = isCover ? 1 : leftPageNum + 1;

  // Animation state
  const [flipping, setFlipping] = useState<'forward' | 'backward' | null>(null);
  const [flipProgress, setFlipProgress] = useState(0); // 0 -> 1
  const animatingRef = useRef(false);

  /* ── Right-to-Left (Forward Page Turn) ────────────────────────── */
  const flipForward = useCallback(() => {
    if (animatingRef.current || rightPageNum >= totalPages) return;
    animatingRef.current = true;
    setFlipping('forward');
    setFlipProgress(0);

    const startTime = performance.now();
    const duration = 480; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic bezier easing
      const eased = 1 - Math.pow(1 - progress, 3);
      setFlipProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        const nextTarget = isCover ? 2 : leftPageNum + 2;
        onPageChange(Math.min(totalPages, nextTarget));
        setFlipping(null);
        setFlipProgress(0);
        animatingRef.current = false;
      }
    };

    requestAnimationFrame(step);
  }, [rightPageNum, totalPages, isCover, leftPageNum, onPageChange]);

  /* ── Left-to-Right (Backward Page Turn) ───────────────────────── */
  const flipBackward = useCallback(() => {
    if (animatingRef.current || currentPage <= 1) return;
    animatingRef.current = true;
    setFlipping('backward');
    setFlipProgress(0);

    const startTime = performance.now();
    const duration = 480; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setFlipProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        const prevTarget = isCover ? 1 : Math.max(1, leftPageNum - 2);
        onPageChange(prevTarget);
        setFlipping(null);
        setFlipProgress(0);
        animatingRef.current = false;
      }
    };

    requestAnimationFrame(step);
  }, [currentPage, isCover, leftPageNum, totalPages, onPageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        flipForward();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        flipBackward();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipForward, flipBackward]);

  const forwardAngle = flipProgress * -180; // 0deg -> -180deg (turns left)
  const backwardAngle = -180 + flipProgress * 180; // -180deg -> 0deg (turns right)

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-2 select-none"
    >
      {/* 3D Spread Container */}
      <div
        className="relative flex items-center justify-center rounded-sm shadow-2xl"
        style={{
          width: `${pageWidth * 2}px`,
          height: `${pageHeight}px`,
          perspective: '2400px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Hardcover Backing Layer */}
        <div
          className="absolute -inset-2 -z-10 rounded-md bg-[#1c1815] shadow-2xl"
          style={{ transform: 'translateZ(-4px)' }}
        />

        {/* ── LEFT PAGE (Underneath) ─────────────────────────────── */}
        <div
          onClick={flipBackward}
          className="group relative overflow-hidden cursor-pointer bg-white border-r border-black/10 shadow-inner"
          style={{
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
          }}
        >
          {leftPageNum > 0 ? (
            <PdfCanvas
              pdf={pdf}
              pageNum={leftPageNum}
              width={pageWidth}
              height={pageHeight}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-muted/40 bg-[#fbf9f5]">
              <span>[ Front Cover ]</span>
            </div>
          )}

          {/* Spine crease shadow on left page */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8"
            style={{
              background:
                'linear-gradient(to left, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.03) 60%, transparent 100%)',
            }}
          />

          {/* Left turn hover overlay */}
          <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center shadow backdrop-blur-sm">
              <ChevronLeft size={16} />
            </div>
          </div>
        </div>

        {/* ── RIGHT PAGE (Underneath) ────────────────────────────── */}
        <div
          onClick={flipForward}
          className="group relative overflow-hidden cursor-pointer bg-white border-l border-black/10 shadow-inner"
          style={{
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
          }}
        >
          {rightPageNum <= totalPages ? (
            <PdfCanvas
              pdf={pdf}
              pageNum={flipping === 'forward' ? rightPageNum + 2 : rightPageNum}
              width={pageWidth}
              height={pageHeight}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-xs text-muted/40 bg-[#fbf9f5]">
              <span>[ Back Cover ]</span>
            </div>
          )}

          {/* Spine crease shadow on right page */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-8"
            style={{
              background:
                'linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.03) 60%, transparent 100%)',
            }}
          />

          {/* Right turn hover overlay */}
          <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center shadow backdrop-blur-sm">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>

        {/* ── 3D TURNING LEAF: RIGHT TO LEFT (Forward) ──────────── */}
        {flipping === 'forward' && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 overflow-hidden shadow-2xl"
            style={{
              left: `${pageWidth}px`,
              width: `${pageWidth}px`,
              height: `${pageHeight}px`,
              transformOrigin: 'left center',
              transform: `rotateY(${forwardAngle}deg)`,
              transformStyle: 'preserve-3d',
              zIndex: 40,
              boxShadow: `${Math.sin(flipProgress * Math.PI) * -30}px 0 35px rgba(0,0,0,0.35)`,
            }}
          >
            {/* Front side of leaf (Right page turning left) */}
            <div
              className="absolute inset-0 bg-white"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <PdfCanvas
                pdf={pdf}
                pageNum={rightPageNum}
                width={pageWidth}
                height={pageHeight}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${0.2 * Math.sin(flipProgress * Math.PI)}) 0%, transparent 60%)`,
                }}
              />
            </div>

            {/* Back side of leaf (New left page landing left) */}
            <div
              className="absolute inset-0 bg-white"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <PdfCanvas
                pdf={pdf}
                pageNum={rightPageNum + 1}
                width={pageWidth}
                height={pageHeight}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${0.2 * Math.sin(flipProgress * Math.PI)}) 0%, transparent 60%)`,
                }}
              />
            </div>
          </div>
        )}

        {/* ── 3D TURNING LEAF: LEFT TO RIGHT (Backward) ─────────── */}
        {flipping === 'backward' && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 overflow-hidden shadow-2xl"
            style={{
              left: 0,
              width: `${pageWidth}px`,
              height: `${pageHeight}px`,
              transformOrigin: 'right center',
              transform: `rotateY(${backwardAngle}deg)`,
              transformStyle: 'preserve-3d',
              zIndex: 40,
              boxShadow: `${Math.sin(flipProgress * Math.PI) * 30}px 0 35px rgba(0,0,0,0.35)`,
            }}
          >
            {/* Back side of leaf (New right page landing right) */}
            <div
              className="absolute inset-0 bg-white"
              style={{
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <PdfCanvas
                pdf={pdf}
                pageNum={leftPageNum - 1}
                width={pageWidth}
                height={pageHeight}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${0.2 * Math.sin(flipProgress * Math.PI)}) 0%, transparent 60%)`,
                }}
              />
            </div>

            {/* Front side of leaf (Left page turning right) */}
            <div
              className="absolute inset-0 bg-white"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <PdfCanvas
                pdf={pdf}
                pageNum={leftPageNum}
                width={pageWidth}
                height={pageHeight}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to left, rgba(0,0,0,${0.2 * Math.sin(flipProgress * Math.PI)}) 0%, transparent 60%)`,
                }}
              />
            </div>
          </div>
        )}

        {/* Center Spine Stitch Divider */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 z-30"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(255,255,255,0.4) 50%, rgba(0,0,0,0.2) 100%)',
          }}
        />
      </div>

      {/* Page Flip Navigation Bar */}
      <div className="mt-3 flex items-center gap-4 text-xs opacity-70 select-none">
        <button
          type="button"
          onClick={flipBackward}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 hover:opacity-100 disabled:opacity-20 transition-opacity"
        >
          <ChevronLeft size={14} /> Turn Left
        </button>
        <span className="tabular font-medium text-[11px]">
          Pages {leftPageNum > 0 ? leftPageNum : 1}–{Math.min(rightPageNum, totalPages)} of {totalPages}
        </span>
        <button
          type="button"
          onClick={flipForward}
          disabled={rightPageNum >= totalPages}
          className="flex items-center gap-1 hover:opacity-100 disabled:opacity-20 transition-opacity"
        >
          Turn Right <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
